import express from "express";
import h from "../../helper/errorHelper";
import { updateSettings, getSettings } from "../../models/settings";
import { assert } from "superstruct";
import { SettingsUpdateInput } from "../../validators/settings";
import APIError from "../../helper/apiError";

const router = express.Router();

router.get("/", h(async (_, res) => {
    const id = res.locals.userId;

    res.status(200).json(
        await getSettings(id)
    )
}));

router.put("/", h(async (req, res) => {
    const id = res.locals.userId;

    // Check if request body is valid
    try {
        assert(req.body, SettingsUpdateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    await updateSettings(id, req.body);

    res.status(200).json(
        await getSettings(id)
    )
}));

export default router;