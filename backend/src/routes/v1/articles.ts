import express from "express";
import h from "../../helper/errorHelper";
import { assert } from "superstruct";
import { ArticleUpdateInput, GetArticlesQuery } from "../../validators/articles";
import APIError from "../../helper/apiError";
import { getArticle, getArticleContent, getArticles, updateArticle } from "../../models/articles";
import { uuid } from "../../validators/uuids";

const router = express.Router();

router.get("/", h(async (req, res) => {
    const id = res.locals.userId;

    // If req.query.feeds is a string, convert it to an array
    if (typeof req.query.feeds === "string") {
        req.query.feeds = [req.query.feeds];
    }

    try {
        assert(req.query, GetArticlesQuery)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    res.status(200).json(
        await getArticles(id, req.query)
    )
}));

router.get("/:id", h(async (req, res) => {
    const id = res.locals.userId;
    const articleId = req.params.id;

    try {
        assert(articleId, uuid)
    } catch (err: any) {
        throw APIError.badRequest("Invalid id")
    }

    const article = await getArticle(id, articleId);

    if (!article) {
        throw APIError.notFound();
    }

    res.status(200).json(article);
}));

router.put("/:id", h(async (req, res) => {
    const id = res.locals.userId;
    const articleId = req.params.id;

    try {
        assert(articleId, uuid)
    } catch (err: any) {
        throw APIError.badRequest("Invalid id")
    }

    try {
        assert(req.body, ArticleUpdateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    await updateArticle(id, articleId, req.body);

    res.status(200).json(
        await getArticle(id, articleId)
    )
}));

router.get("/:id/content", h(async (req, res) => {
    const articleId = req.params.id;

    try {
        assert(articleId, uuid)
    } catch (err: any) {
        throw APIError.badRequest("Invalid id")
    }

    const article = await getArticleContent(articleId);

    if (!article) {
        throw APIError.notFound();
    }

    res.status(200).json({
        content: article
    });
}));


export default router;