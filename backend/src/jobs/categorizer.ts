import { getPrismaClient } from "../prismaClient";
import { Readability } from '@mozilla/readability';
import natural from 'natural'
import { getDomFromUrl } from "../helper/htmlParsing";
import log, { Level, Scope } from "../helper/logger";
import { environment } from "../helper/environment";

const classifierJSONDe = require('../../static/classifierTrainedDe.json')
const classifierDe = natural.BayesClassifier.restore(classifierJSONDe, natural.PorterStemmerDe);

const classifierJSONEn = require('../../static/classifierTrainedEn.json')
const classifierEn = natural.BayesClassifier.restore(classifierJSONEn, natural.PorterStemmer);


const prisma = getPrismaClient();

let runningCategorization = false

export async function categorizeArticles() {
    if (runningCategorization) {
        return;
    }

    runningCategorization = true;

    try {
        log("Categorizing articles", Scope.CATEGORIZER);

        while (await prisma.article.count({
            where: {
                category: null
            }
        }) > 0) {
            const article = await prisma.article.findFirst({
                where: {
                    category: null
                }
            });

            if (!article) {
                break;
            }
            let category

            try {
                category = await categorizeArticle(article.link);
            } catch (err) {
                log(err, Scope.CATEGORIZER, Level.ERROR);
                continue;
            }

            if (!category) {
                category = "Uncategorized"
            }

            await prisma.article.update({
                where: {
                    id: article.id
                },
                data: {
                    category: {
                        connectOrCreate: {
                            where: {
                                name: category
                            },
                            create: {
                                name: category
                            }
                        }
                    }
                }
            });
            log("Categorized article " + article.title + " as " + category, Scope.CATEGORIZER);
        }
    } catch (err) {
        log("Error while categorizing Article: " + err, Scope.CATEGORIZER, Level.ERROR);
    } finally {
        runningCategorization = false;
    }

    log("Finished categorizing articles", Scope.CATEGORIZER);
    runningCategorization = false;
}

async function categorizeArticle(url: string): Promise<string | null> {
    const dom = await getDomFromUrl(url);
    const article = new Readability(dom.window.document).parse();

    if (article && article.lang === "de" && article.textContent) {
        return classifierDe.classify(article.textContent);
    } else if (article && article.lang === "en" && article.textContent) {
        return classifierEn.classify(article.textContent);
    } else {
        return null;
    }

}

/**
 * Initialize the categorizer
 * @param intervall The intervall in ms to categorize the articles
 */
export async function initCategorizer(
  intervall = Number(environment.feedUpdateInterval),
) {
  try {
    log(
      "Initializing Categorizer with an intervall of " + intervall + "ms",
      Scope.CATEGORIZER,
    );
    let time = new Date().getTime();
  do {
      try {
        await categorizeArticles();
      } catch (error) {
        log("Error while categorizing articles: " + error, Scope.CATEGORIZER);
      }

      // Wait until intervall is over (only if the cronjob is not handled externally)
      if (!environment.externalCronjobs) {
        await new Promise((resolve) =>
          setTimeout(resolve, intervall - (new Date().getTime() - time)),
        );
      }
      time = new Date().getTime();
    } while (true && !environment.externalCronjobs);
  } catch (error) {
    log("Error while categorizing feeds: " + error, Scope.CATEGORIZER, Level.ERROR);
    log("Categorizer job failed. Attempting to restart...", Scope.CATEGORIZER);
    initCategorizer(intervall);
  }
}