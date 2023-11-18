import express from "express";
import { loginUser, registerUser } from "../../models/user";
import APIError from "../../helper/apiError";
import h from "../../helper/errorHelper";
import { assert } from "superstruct";
import { UserRegisterInput } from "../../validators/user";

const router = express.Router();

router.post("/", h(async (req, res) => {
    // Check if request body is valid
    try {
        assert(req.body, UserRegisterInput)
    } catch (err: any) {
        throw APIError.badRequest(err.message)
    }

    // Register user
    const user = await registerUser(req.body.name, req.body.email, req.body.password)

    res.status(201).json({
        token: await loginUser(req.body.email, req.body.password),
        user
    });

}))

export default router;