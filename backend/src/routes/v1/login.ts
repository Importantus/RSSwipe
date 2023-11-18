import express from "express";
import h from "../../helper/errorHelper";
import APIError from "../../helper/apiError";
import { loginUser } from "../../models/user";
import { assert } from "superstruct";
import { UserLoginInput } from "../../validators/user";

const router = express.Router();

router.post("/", h(async (req, res) => {
    // Check if request body is valid
    try {
        assert(req.body, UserLoginInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }
    // Login user
    const token = await loginUser(req.body.email, req.body.password)

    res.status(200).json({
        token
    });

}));

export default router;