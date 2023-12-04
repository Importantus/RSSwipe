import express from "express";
import h from "../../helper/errorHelper";
import { getStarredArticles, updateStarredArticle } from "../../models/starred";
import { getArticle } from "../../models/articles"
import APIError from "../../helper/apiError";

const router = express.Router();

router.get("/", h(async (_, res) => {
    const id = res.locals.userId;
    res.status(200).json(
        await getStarredArticles(id)
    );
}))

router.put("/:article", h(async (req, res) => {
    const id = res.locals.userId;
    await updateStarredArticle(req.body.articleId, id, req.body.starred)
    res.status(200).json(
        await getArticle(id, req.body.articleId)
    );
}))

export default router;