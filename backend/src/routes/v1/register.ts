import express from "express";
import { loginUser, registerUser } from "../../models/user";
import APIError from "../../helper/apiError";
import h from "../../helper/errorHelper";

const router = express.Router();

router.post("/", h(async (req, res) => {
    // Check if request body is valid
    if (!req.body.name || !req.body.email || !req.body.password) {
        throw APIError.badRequest("Invalid request body");
    }

    // Register user
    const user = await registerUser(req.body.name, req.body.email, req.body.password)

    res.status(201).json({
        token: await loginUser(req.body.email, req.body.password),
        user
    });

}))

export default router;