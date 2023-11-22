import * as s from 'superstruct';

// ISO 8601 date format with milliseconds
const date = s.refine(s.string(), 'date', value => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
});


// Validator for settings update
export const SettingsUpdateInput = s.object({
    expTimeRead: s.optional(date),
    expTimeUnread: s.optional(date),
});

export type SettingsUpdateInputType = s.Infer<typeof SettingsUpdateInput>;
