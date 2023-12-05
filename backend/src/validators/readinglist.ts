import * as s from 'superstruct';
import { uuid } from "./uuids";

export const ReadinglistUpdateInput = s.object({
    id: uuid
});

export type ReadinglistUpdateInputType = s.Infer<typeof ReadinglistUpdateInput>;