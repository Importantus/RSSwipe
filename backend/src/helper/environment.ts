function constructEnv(name: string, mandatory: boolean = true): string {
    const env = process.env[name];
    if (!env && mandatory) {
        throw new Error(`Environment variable ${name} not found`);
    }
    return env || "";
}

export const environment = {
    // THIS IS NOT BEST PRACTICE!!! We only define the sercets here, 
    // because we don't have access to the secret management in deployment
    jwtSecret: "supersecret",
    jwtExpiration: "30d",
    dbHost: constructEnv("DB_HOST"),
    dbPort: constructEnv("DB_PORT"),
    dbDatabase: constructEnv("DB_DATABASE"),
    dbUser: constructEnv("DB_USER"),
    dbPassword: constructEnv("DB_PASSWORD"),
    status: constructEnv("STATUS", false),
    backendPort: constructEnv("BACKEND_PORT"),
    backendURL: constructEnv("BACKEND_URL"),
    viteBackendURL: constructEnv("VITE_BACKEND_URL"),
    feedUpdateInterval: 1000 * 60 * 10,
    timeToDeleteOldArticles: 1000 * 60 * 60 * 24 * 10,
};

