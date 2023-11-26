import * as s from 'superstruct';


const timestamp = s.refine(s.number(), 'timestamp', value => {
    
    return Number.isInteger(value) && value > 0;
});


export const SettingsUpdateInput = s.object({
    expTimeRead: s.optional(timestamp),
    expTimeUnread: s.optional(timestamp),
});

export type SettingsUpdateInputType = s.Infer<typeof SettingsUpdateInput>;




