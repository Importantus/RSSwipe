import * as s from 'superstruct';

const limit = s.size(s.string(), 1, 50);
const feeds = s.array(s.string());

const read = s.boolean();
const seen = s.boolean();
const starred = s.boolean();
const saved = s.boolean();

export const GetArticlesQuery = s.object({
    limit: s.optional(limit),
    feeds: s.optional(feeds)
});

export const ArticleUpdateInput = s.object({
    read: s.optional(read),
    seen: s.optional(seen),
    starred: s.optional(starred),
    saved: s.optional(saved)
});

export type GetArticlesQueryType = s.Infer<typeof GetArticlesQuery>;
export type ArticleUpdateInputType = s.Infer<typeof ArticleUpdateInput>;