function constructEnv(name: string, defaultOption: string = ""): string {
    const env = process.env[name];
    if (!env && !defaultOption) {
        throw new Error(`Environment variable ${name} not found`);
    }
    return env || defaultOption;
}

export const environment = {
    // TO DEFINE THE SECRETS HERE IS BAD PRACTICE!!! We only do that, 
    // because we don't have access to the secret management in deployment
    jwtSecret: "supersecret",
    jwtExpiration: "30d",
    dbHost: constructEnv("DB_HOST"),
    dbPort: constructEnv("DB_PORT"),
    dbDatabase: constructEnv("DB_DATABASE"),
    dbUser: constructEnv("DB_USER"),
    dbPassword: constructEnv("DB_PASSWORD"),
    status: constructEnv("STATUS", "production"),
    backendPort: constructEnv("BACKEND_PORT", "8080"),
    feedUpdateInterval: 1000 * 60 * 1,
    timeToDeleteOldArticles: 1000 * 60 * 60 * 24 * 7,
    garbageCollectorInterval: 1000 * 60 * 60 * 1,
    maxUrlLength: 1000, // Default size for all urls
    maxImageUrlLength: 10000, // Sometimes, image urls can be stored in an optimized format, which can be longer than the other urls
};

