import { PrismaClient, Settings } from "@prisma/client";
import APIError from "../helper/apiError";
import {SettingsUpdateInputType} from "../validators/settings"
const prisma = new PrismaClient();



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
export async function updateSettings(id: string, updateData: SettingsUpdateInputType) {
    const settingsid = await getSettingsIdByUserId(id);


    await prisma.settings.update({
        where: {
            id:settingsid
        },
        data: {
            expTimeRead: updateData.expTimeRead,
            expTimeUnread: updateData.expTimeUnread,
        }
    });
}
export async function getSettings(userId:string) {
    const settingsid = await getSettingsIdByUserId(userId);
   
        const settings = await prisma.settings.findUnique({
            where: {
                id:settingsid
            }
        });
        return settings;
    
}




function getSettingsById(id: string) {
    throw new Error("Function not implemented.");
}
