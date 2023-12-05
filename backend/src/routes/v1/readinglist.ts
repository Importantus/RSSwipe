import express from "express";
import { addArticleToReadingList, getReadingList } from "../../models/readinglist";
import h from "../../helper/errorHelper";
import { assert } from "superstruct";
import APIError from "../../helper/apiError";
import { ReadinglistUpdateInput } from "../../validators/readinglist";

const router = express.Router();

router.get("/", h(async (_, res) => {
    const id = res.locals.userId;

    res.status(200).json(
        await getReadingList(id)
    )
}));

router.put("/", h(async (req, res) => {
    const id = res.locals.userId;
    const articleId = req.body

    try {
        assert(articleId, ReadinglistUpdateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    res.status(200).json(
        await addArticleToReadingList(id, articleId.id)
    )
}));

router.delete("/", h(async (req, res) => {
    const id = res.locals.userId;
    const articleId = req.body

    try {
        assert(articleId, ReadinglistUpdateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    res.status(200).json(
        await addArticleToReadingList(id, articleId.id)
    )
}));

export default router;