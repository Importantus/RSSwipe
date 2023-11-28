import * as s from 'superstruct';


const time = s.number();


export const SettingsUpdateInput = s.object({
    expTimeRead: s.optional(time),
    expTimeUnread: s.optional(time),
});

export type SettingsUpdateInputType = s.Infer<typeof SettingsUpdateInput>;




