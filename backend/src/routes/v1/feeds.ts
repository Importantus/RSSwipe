import express from "express";
import h from "../../helper/errorHelper";
import { followFeed, getFeedInfo, getFollowedFeeds, unfollowFeed, updateFeed } from "../../models/feeds";
import APIError from "../../helper/apiError";
import { assert } from "superstruct";
import { FeedCreateInput, FeedUpdateInput } from "../../validators/feeds";


const router = express.Router();

router.get("/", h(async (_, res) => {
    const id = res.locals.userId;

    res.status(200).json(
        await getFollowedFeeds(id)
    )
}));

router.post("/", h(async (req, res) => {
    const id = res.locals.userId;

    try {
        assert(req.body, FeedCreateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    const feed = await followFeed(id, req.body);

    res.status(200).json(
        await getFeedInfo(id, feed.id)
    );
}))

router.get("/:feedId", h(async (req, res) => {
    const id = res.locals.userId;
    const feedId = req.params.feedId;

    res.status(200).json(
        await getFeedInfo(id, feedId)
    );
}))

router.delete("/:feedId", h(async (req, res) => {
    const id = res.locals.userId;
    const feedId = req.params.feedId;

    await unfollowFeed(id, feedId);

    res.status(200).json({
        message: "Feed unfollowed"
    })
}))

router.put("/:feedId", h(async (req, res) => {
    const id = res.locals.userId;
    const feedId = req.params.feedId;

    try {
        assert(req.body, FeedUpdateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    await updateFeed(id, feedId, req.body);

    res.status(200).json(
        await getFeedInfo(id, feedId)
    );
}))

export default router;