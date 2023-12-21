import { getPrismaClient } from "../prismaClient";
import { Readability } from '@mozilla/readability';
import axios from "axios";
import { JSDOM, VirtualConsole } from 'jsdom';
import natural from 'natural'

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
        console.log("Categorizing articles");

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
                console.error(err);
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
            console.log("Categorized article " + article.title + " as " + category);
        }
    } catch (err) {
        console.error(err);
    } finally {
        runningCategorization = false;
    }

    runningCategorization = false;
}

async function categorizeArticle(url: string) {
    const res = await axios.get(url);
    const html = res.data;
    const virtualConsole = new VirtualConsole();
    const doc = new JSDOM(html, { virtualConsole });
    const article = new Readability(doc.window.document).parse();

    if (article && article.lang === "de") {
        return classifierDe.classify(article.textContent);
    } else if (article && article.lang === "en") {
        return classifierEn.classify(article.textContent);
    } else {
        return null;
    }
}