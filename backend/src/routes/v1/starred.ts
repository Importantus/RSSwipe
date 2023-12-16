import express from "express";
import h from "../../helper/errorHelper";
import { getStarredArticles, updateStarredArticle } from "../../models/starred";
import { getArticle } from "../../models/articles"
import APIError from "../../helper/apiError";
import { uuid } from "../../validators/uuids";
import { assert } from "superstruct";

const router = express.Router();

router.get("/", h(async (_, res) => {
    const id = res.locals.userId;
    res.status(200).json(
        await getStarredArticles(id)
    );
}))

router.post("/:article", h(async (req, res) => {
    const id = res.locals.userId;
    const articleId = req.body.id;
    try {
        assert(articleId, uuid)
    } catch (err: any) {
        throw APIError.badRequest("Invalid id")
    }
    await updateStarredArticle(articleId, id, true)
    res.status(200).json(
        await getArticle(id, articleId)
    );
}))

router.delete("/:article", h(async (req, res) => {
    const id = res.locals.userId;
    const articleId = req.body.id;
    try {
        assert(articleId, uuid)
    } catch (err: any) {
        throw APIError.badRequest("Invalid id")
    }
    await updateStarredArticle(articleId, id, false)
    res.status(200).json(
        await getArticle(id, articleId)
    );
}))

export default router;