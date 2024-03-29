function constructEnv(name: string, defaultOption: string = ""): string {
    const env = process.env[name];
    if (!env && !defaultOption) {
        throw new Error(`Environment variable ${name} not found`);
    }
    return env || defaultOption;
}

export const environment = {
    // TO DEFINE THE DEFAULT SECRETS HERE IS BAD PRACTICE!!! 
    jwtSecret: constructEnv("JWT_SECRET"),
    jwtExpiration: constructEnv("JWT_EXPIRATION", "30d"),
    dbUrl: constructEnv("DATABASE_URL"),
    status: constructEnv("STATUS", "production"),
    backendPort: constructEnv("BACKEND_PORT", "8080"),
    feedUpdateInterval: constructEnv("FEED_UPDATE_INTERVAL", (1000 * 60 * 10).toString()),
    maxArticleAge: constructEnv("TIME_TO_DELETE_OLD_ARTICLES", (1000 * 60 * 60 * 24 * 7).toString()),
    garbageCollectorInterval: constructEnv("GARBAGE_COLLECTOR_INTERVAL", (1000 * 60 * 60 * 1).toString()),
    maxUrlLength: constructEnv("MAX_URL_LENGTH", "1000"), // Default size for all urls
    maxImageUrlLength: constructEnv("MAX_IMAGE_URL_LENGTH", "10000"), // Sometimes, image urls can be stored in an optimized format, which can be longer than the other urls
    maxFeedErrorCount: constructEnv("MAX_FEED_ERROR_COUNT", "20"), // If a feed has more than 20 errors, it will be disabled. Currently it is __not possible__ to re-enable a feed
    enableFeedClassification: constructEnv("ENABLE_FEED_CLASSIFICATION", "false"),
    maxContentLength: constructEnv("MAX_CONTENT_LENGTH", "2000000"), // Maximum length of the content of an article or feed in bytes
};

