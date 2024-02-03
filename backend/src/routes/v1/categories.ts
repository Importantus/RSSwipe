import express from "express";
import { getCategories } from "../../models/categories";
import h from "../../helper/errorHelper";
import { environment } from "../../helper/environment";


const router = express.Router();

router.get("/", h(async (_, res) => {
    const categories = environment.enableFeedClassification === "true" ? await getCategories() : [];
    res.status(200).json(categories)
}));

export default router;