import { PrismaClient } from "@prisma/client";
import { environment } from "./helper/environment";

export const getPrismaClient = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: environment.dbUrl,
            }
        }
    });
}