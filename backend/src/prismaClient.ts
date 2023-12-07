import { PrismaClient } from "@prisma/client";
import { environment } from "./helper/environment";

export const getPrismaClient = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: `mysql://${environment.dbUser}:${environment.dbPassword}@${environment.dbHost}:${environment.dbPort}/${environment.dbDatabase}`,
            }
        }
    });
}