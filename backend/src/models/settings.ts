import { PrismaClient, Settings } from "@prisma/client";
import APIError from "../helper/apiError";
import {SettingsUpdateInputType} from "../validators/settings"
const prisma = new PrismaClient();

export async function getSettings(id: string) {
    const settings = await getSettingsById(id);

    if (!settings) {
        throw APIError.notFound();
    }

    return {
        exprTimeRead: settings,
        exprTimeUnRead: settings
    };
}

export async function updateSettings(id: string, updateData: SettingsUpdateInputType) {
    const settings = await getSettingsById(id);

    if (!settings) {
        throw APIError.notFound();
    }

    await prisma.settings.update({
        where: {
            id
        },
        data: {
            expTimeRead: updateData.expTimeRead,
            expTimeUnread: updateData.expTimeUnread,
        }
    });
}

async function getSettingsById(id: string) {
    const settings = await prisma.settings.findUnique({
        where: {
            id
        }
    });
    return settings;
}