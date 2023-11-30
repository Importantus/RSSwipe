import * as s from 'superstruct';

export const uuid = s.size(s.string(), 36, 36);

export type UUID = s.Infer<typeof uuid>;