import express from "express";
import h from "../../helper/errorHelper";
import { getNumbersSinceMaxAge } from "../../models/statistics";

const router = express.Router();

router.get("/recent", h(async (_, res) => {
    const id = res.locals.userId;
    res.status(200).json(
        await getNumbersSinceMaxAge(id)
    );
}))

export default router;