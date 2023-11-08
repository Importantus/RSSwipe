import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import articleRouter from "./routes/articles";
import feedRouter from "./routes/feeds";
import loginRouter from "./routes/login";
import readinglistRouter from "./routes/readinglist";
import settingsRouter from "./routes/settings";
import userRouter from "./routes/user";
import registerRouter from "./routes/register";

import { auth, notFound, errorHandler } from "./middleware";

const app = express();
const port = process.env.PORT || 8080;

interface APIVersion {
    path: string;
    name: string;
    resources: Resource[];
    apiDoc?: any;
}

interface Resource {
    path: string;
    router?: express.Router;
    name: string;
    auth?: boolean;
}

const versions: APIVersion[] = [
    {
        path: "/v1",
        name: "v1",
        apiDoc: require("../openapi.json"),
        resources: [
            {
                path: "/user",
                router: userRouter,
                name: "user",
                auth: true
            },
            {
                path: "/settings",
                router: settingsRouter,
                name: "settings",
                auth: true
            },
            {
                path: "/login",
                router: loginRouter,
                name: "login"
            },
            {
                path: "/register",
                router: registerRouter,
                name: "register"
            },
            {
                path: "/feeds",
                router: feedRouter,
                name: "feeds",
                auth: true
            },
            {
                path: "/articles",
                router: articleRouter,
                name: "articles",
                auth: true
            },
            {
                path: "/readinglist",
                router: readinglistRouter,
                name: "readinglist",
                auth: true
            }
        ]
    }
]

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Print all available versions
app.get("/", (_, res) => {
    res.json(versions.map(version => {
        return {
            version: version.name,
            path: `/${version.path}`
        }
    }));
});

// Print all available resources for each version
versions.forEach(version => {
    app.get(`${version.path}`, (_, res) => {
        res.json(version.resources.map(resource => {
            return {
                path: `${version.path}${resource.path}`,
                name: resource.name
            }
        }));
    });
})

// Register all routes
versions.forEach(version => {
    version.resources.forEach(resource => {
        if (resource.router) {
            if (resource.auth) {
                app.use(`${version.path}${resource.path}`, auth, resource.router);
            } else {
                app.use(`${version.path}${resource.path}`, resource.router);
            }
        }
    })
    app.use(`${version.path}/api-docs`, swaggerUi.serve, swaggerUi.setup(version.apiDoc));
})

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
})