import express from "express";
import { getCategories } from "../../models/categories";
import h from "../../helper/errorHelper";


const router = express.Router();

router.get("/", h(async (_, res) => {
    res.status(200).json(await getCategories())
}));

export default router;