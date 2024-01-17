import express from "express";
import h from "../../helper/errorHelper";
import { environment } from "../../helper/environment";

const router = express.Router();

router.get("/", h(async (_, res) => {
    res.status(200).json(
        {
            // Get version from package.json
            version: require("../../../package.json").version,
            uptime: process.uptime(),
            status: environment.status,
            feedUpdateInterval: environment.feedUpdateInterval,
            garbageCollectionInterval: environment.garbageCollectorInterval,
            maxArticleAge: environment.maxArticleAge,
        }
    );
}))

export default router;