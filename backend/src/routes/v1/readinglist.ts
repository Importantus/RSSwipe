import express from "express";
import { addArticleToReadingList, getReadingList, removeArticleFromReadingList, removeArticlesFromReadingList } from "../../models/readinglist";
import h from "../../helper/errorHelper";
import { assert } from "superstruct";
import APIError from "../../helper/apiError";
import { ReadingListDeleteBoolean, ReadinglistUpdateInput } from "../../validators/readinglist";

const router = express.Router();

router.get("/", h(async (_, res) => {
    const id = res.locals.userId;

    res.status(200).json(
        await getReadingList(id)
    )
}));

router.post("/articles", h(async (req, res) => {
    const id = res.locals.userId;
    const articleId = req.body

    try {
        assert(articleId, ReadinglistUpdateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    await addArticleToReadingList(id, articleId.id)

    res.status(200).json({
        message: "Article added to reading list"
    })
}));

router.delete("/articles", h(async (req, res) => {
    const id = res.locals.userId;
    const articleId = req.body

    try {
        assert(articleId, ReadinglistUpdateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    await removeArticleFromReadingList(id, articleId.id)

    res.status(200).json({
        message: "Article deleted from reading list"
    })
}));

router.delete("/", h(async (req, res) => {
    const id = res.locals.userId;

    try {
        assert(req.body, ReadingListDeleteBoolean)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    await removeArticlesFromReadingList(id, req.body.onlyRead)

    res.status(200).json({
        message: "Reading list cleared"
    })
}))

export default router;