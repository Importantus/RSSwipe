import express from "express";
import { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
    res.json({
        hallo: "welt"
    })
})

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
})