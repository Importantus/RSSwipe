import * as s from 'superstruct';
import { environment } from '../helper/environment';

const url = s.size(s.string(), 1, Number(environment.maxUrlLength));
const openInApp = s.boolean();

export const FeedCreateInput = s.object({
    url,
    openInApp: s.optional(openInApp),
});

export const FeedUpdateInput = s.object({
    openInApp: s.optional(openInApp),
});

export type FeedCreateInputType = s.Infer<typeof FeedCreateInput>;
export type FeedUpdateInputType = s.Infer<typeof FeedUpdateInput>;