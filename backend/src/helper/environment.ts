function constructEnv(name: string): string {
    const env = process.env[name];
    if (!env) {
        throw new Error(`Environment variable ${name} not found`);
    }
    return env
}

export const environment = {
    jwtSecret: constructEnv("JWT_SECRET"),
    jwtExpiration: constructEnv("JWT_EXPIRATION"),
    dbHost: constructEnv("DB_HOST"),
    dbPort: constructEnv("DB_PORT"),
    dbDatabase: constructEnv("DB_DATABASE"),
    dbUser: constructEnv("DB_USER"),
    dbPassword: constructEnv("DB_PASSWORD"),
    status: constructEnv("STATUS"),
    backendPort: constructEnv("BACKEND_PORT"),
    backendURL: constructEnv("BACKEND_URL"),
    viteBackendURL: constructEnv("VITE_BACKEND_URL"),
};

