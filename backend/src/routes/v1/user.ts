import express from "express";
import h from "../../helper/errorHelper";
import { deleteUser, getUserData, updateUserData } from "../../models/user";
import { assert } from "superstruct";
import { UserDeleteInput, UserUpdateInput } from "../../validators/user";
import APIError from "../../helper/apiError";

const router = express.Router();

router.get("/", h(async (_, res) => {
    const id = res.locals.userId;

    res.status(200).json(
        await getUserData(id)
    )
}));

router.put("/", h(async (req, res) => {
    const id = res.locals.userId;

    // Check if request body is valid
    try {
        assert(req.body, UserUpdateInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    await updateUserData(id, req.body);

    res.status(200).json(
        await getUserData(id)
    )
}));

router.delete("/", h(async (req, res) => {
    const id = res.locals.userId;

    // Check if request body is valid
    try {
        assert(req.body, UserDeleteInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    await deleteUser(id, req.body);

    res.status(200).json({
        message: "User deleted"
    })
}));

export default router;