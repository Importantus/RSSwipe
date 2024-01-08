import * as s from 'superstruct';
import { uuid } from "./uuids";

export const ReadinglistUpdateInput = s.object({
    id: uuid
});

export const ReadingListDeleteBoolean = s.object({
    onlyRead: s.boolean()
});

export type ReadinglistUpdateInputType = s.Infer<typeof ReadinglistUpdateInput>;
export type ReadingListDeleteBooleanType = s.Infer<typeof ReadingListDeleteBoolean>;