import * as s from 'superstruct';

const limit = s.size(s.string(), 1, 50);
const feeds = s.array(s.string());
const categories = s.array(s.string());
const isoDate = s.pattern(s.string(), /^(\d{4})-(\d{2})-(\d{2})$/);

const read = s.boolean();
const seen = s.boolean();
const starred = s.boolean();
const saved = s.boolean();

export const GetArticlesQuery = s.object({
    limit: s.optional(limit),
    feeds: s.optional(feeds),
    categories: s.optional(categories),
    startDate: s.optional(isoDate),
    endDate: s.optional(isoDate)
});

export const ArticleUpdateInput = s.object({
    read: s.optional(read),
    seen: s.optional(seen),
    starred: s.optional(starred),
    saved: s.optional(saved)
});

export type GetArticlesQueryType = s.Infer<typeof GetArticlesQuery>;
export type ArticleUpdateInputType = s.Infer<typeof ArticleUpdateInput>;