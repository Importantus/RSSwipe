import { getPrismaClient } from "../prismaClient";

const prisma = getPrismaClient();

export async function getCategories() {
    return await prisma.category.findMany();
}