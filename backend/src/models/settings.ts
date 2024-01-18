import { PrismaClient } from "@prisma/client";
import APIError from "../helper/apiError";
import { SettingsUpdateInputType } from "../validators/settings"
import { getPrismaClient } from "../prismaClient";
import { deleteExpiredArticlesFromReadingList } from "../jobs/garbageCollector";
const prisma = getPrismaClient();

export async function getSettingsIdByUserId(userId: string) {

    const settings = await prisma.settings.findFirst({
        where: {
            userId: userId
        },
        select: {
            id: true
        }
    });

    if (!settings) {
        throw APIError.notFound();
    }

    return settings.id;
}


export async function updateSettings(userId: string, updateData: SettingsUpdateInputType) {
    const settingsid = await getSettingsIdByUserId(userId);

    await prisma.settings.update({
        where: {
            id: settingsid
        },
        data: {
            expTimeRead: updateData.expTimeRead,
            expTimeUnread: updateData.expTimeUnread,
        }
    });
}


export async function getSettings(userId: string) {
    const settingsid = await getSettingsIdByUserId(userId);

    const settings = await prisma.settings.findUnique({
        where: {
            id: settingsid
        }
    });
    return {
        expTimeRead: settings?.expTimeRead,
        expTimeUnread: settings?.expTimeUnread
    };
}
