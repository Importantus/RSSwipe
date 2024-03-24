import { getPrismaClient } from "../prismaClient";
import { Readability } from '@mozilla/readability';
import natural from 'natural'
import { getDomFromUrl } from "../helper/htmlParsing";
import log, { Level, Scope } from "../helper/logger";

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

async function categorizeArticle(url: string) {
    const dom = await getDomFromUrl(url);
    const article = new Readability(dom.window.document).parse();

    if (article && article.lang === "de") {
        return classifierDe.classify(article.textContent);
    } else if (article && article.lang === "en") {
        return classifierEn.classify(article.textContent);
    } else {
        return null;
    }

}