import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import v1articleRouter from "./routes/v1/articles";
import v1feedRouter from "./routes/v1/feeds";
import v1loginRouter from "./routes/v1/login";
import v1readinglistRouter from "./routes/v1/readinglist";
import v1settingsRouter from "./routes/v1/settings";
import v1userRouter from "./routes/v1/user";
import v1registerRouter from "./routes/v1/register";
import v1starredRouter from "./routes/v1/starred";
import v1categoriesRouter from "./routes/v1/categories";
import v1statisticsRouter from "./routes/v1/statistics";
import v1systemRouter from "./routes/v1/system";

import { auth, notFound, errorHandler } from "./middleware";

import { environment } from "./helper/environment";
import { initFeedParser } from "./jobs/feedparser";
import { initGarbageCollector } from "./jobs/garbageCollector";
import log, { Scope } from "./helper/logger";

const app = express();
const port = environment.backendPort;

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
                router: v1userRouter,
                name: "user",
                auth: true
            },
            {
                path: "/settings",
                router: v1settingsRouter,
                name: "settings",
                auth: true
            },
            {
                path: "/login",
                router: v1loginRouter,
                name: "login"
            },
            {
                path: "/register",
                router: v1registerRouter,
                name: "register"
            },
            {
                path: "/feeds",
                router: v1feedRouter,
                name: "feeds",
                auth: true
            },
            {
                path: "/articles",
                router: v1articleRouter,
                name: "articles",
                auth: true
            },
            {
                path: "/readinglist",
                router: v1readinglistRouter,
                name: "readinglist",
                auth: true
            },
            {
                path: "/starred",
                router: v1starredRouter,
                name: "starred",
                auth: true
            },
            {
                path: "/categories",
                router: v1categoriesRouter,
                name: "categories",
                auth: true
            },
            {
                path: "/statistics",
                router: v1statisticsRouter,
                name: "statistics",
                auth: true
            },
            {
                path: "/system",
                router: v1systemRouter,
                name: "system",
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
            path: `${version.path}`
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

try {
    initFeedParser();
} catch (e) {
    log("Error while parsing feeds: " + e, Scope.FEEDPARSER);
}

try {
    initGarbageCollector();
} catch (e) {
    log("Error while bringing out the trash: " + e, Scope.GARBAGE_COLLECTOR);
}

app.listen(port, () => {
    log(`Server started at http://localhost:${port}`, Scope.API);
})