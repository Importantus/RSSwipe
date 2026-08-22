import express from "express";
import h from "../../helper/errorHelper";
import { exportFeedsAsOpml, followFeed, getFeedInfo, getFollowedFeeds, importFeedsFromOpml, unfollowFeed, updateFeed } from "../../models/feeds";
import APIError from "../../helper/apiError";
import { assert } from "superstruct";
import { FeedCreateInput, FeedUpdateInput } from "../../validators/feeds";
import { uuid } from "../../validators/uuids";


const router = express.Router();

// Parses the raw OPML document of an import request. Body-parser errors
// e.g. exceeding the size limit are converted into bad requests.
const opmlBodyParser = [
    express.text({
        type: ["text/xml", "application/xml", "text/x-opml"],
        limit: "5mb"
    }),
    (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        // All body-parser errors are marked with a "type" property
        if (typeof err?.type === "string") {
            next(APIError.badRequest("Invalid request body: " + err.message));
        } else {
            next(err);
        }
    }
];

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

// Must be registered before /:feedId routes
router.get("/export", h(async (_, res) => {
    const id = res.locals.userId;

    const opml = await exportFeedsAsOpml(id);

    res.setHeader("Content-Type", "text/x-opml; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="feeds.opml"');
    res.status(200).send(opml);
}))

// Must be registered before /:feedId routes
router.post("/import", opmlBodyParser, h(async (req, res) => {
    const id = res.locals.userId;

    if (typeof req.body !== "string" || req.body.trim().length === 0) {
        throw APIError.badRequest("Request body must be an OPML document");
    }

    res.status(200).json(
        await importFeedsFromOpml(id, req.body)
    );
}))

router.get("/:feedId", h(async (req, res) => {
    const id = res.locals.userId;
    const feedId = req.params.feedId;

    try {
        assert(feedId, uuid)
    } catch (err: any) {
        throw APIError.badRequest("Invalid id")
    }

    res.status(200).json(
        await getFeedInfo(id, feedId)
    );
}))

router.delete("/:feedId", h(async (req, res) => {
    const id = res.locals.userId;
    const feedId = req.params.feedId;

    try {
        assert(feedId, uuid)
    } catch (err: any) {
        throw APIError.badRequest("Invalid id")
    }

    await unfollowFeed(id, feedId);

    res.status(200).json({
        message: "Feed unfollowed"
    })
}))

router.put("/:feedId", h(async (req, res) => {
    const id = res.locals.userId;
    const feedId = req.params.feedId;

    try {
        assert(feedId, uuid)
    } catch (err: any) {
        throw APIError.badRequest("Invalid id")
    }

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