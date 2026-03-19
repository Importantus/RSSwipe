import { PrismaClient } from "@prisma/client";
import { environment } from "./helper/environment";

let prismaInstance: PrismaClient;

export const getPrismaClient = () => {
    if (!prismaInstance) {
        prismaInstance = new PrismaClient({
            datasources: {
                db: {
                    url: environment.dbUrl,
                }
            }
        });
    }
    
    return prismaInstance;
}
