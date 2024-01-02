function constructEnv(name: string, defaultOption: string = ""): string {
    const env = process.env[name];
    if (!env && !defaultOption) {
        throw new Error(`Environment variable ${name} not found`);
    }
    return env || defaultOption;
}

export const environment = {
    // TO DEFINE THE DEFAULT SECRETS HERE IS BAD PRACTICE!!! We only do that, 
    // because we don't have access to the secret management in deployment
    jwtSecret: constructEnv("JWT_SECRET", "secret"),
    jwtExpiration: constructEnv("JWT_EXPIRATION", "30d"),
    dbHost: constructEnv("DB_HOST"),
    dbPort: constructEnv("DB_PORT"),
    dbDatabase: constructEnv("DB_DATABASE"),
    dbUser: constructEnv("DB_USER"),
    dbPassword: constructEnv("DB_PASSWORD"),
    status: constructEnv("STATUS", "production"),
    backendPort: constructEnv("BACKEND_PORT", "8080"),
    feedUpdateInterval: constructEnv("FEED_UPDATE_INTERVAL", (1000 * 60 * 10).toString()),
    maxArticleAge: constructEnv("TIME_TO_DELETE_OLD_ARTICLES", (1000 * 60 * 60 * 24 * 7).toString()),
    garbageCollectorInterval: constructEnv("GARBAGE_COLLECTOR_INTERVAL", (1000 * 60 * 60 * 1).toString()),
    maxUrlLength: constructEnv("MAX_URL_LENGTH", "1000"), // Default size for all urls
    maxImageUrlLength: constructEnv("MAX_IMAGE_URL_LENGTH", "10000"), // Sometimes, image urls can be stored in an optimized format, which can be longer than the other urls
};

