interface Article {
    id: string;
    title: string;
    imageUrl: string;
    link: string;
    publishedAt: string;
    createdAt: string;
    feed: {
        id: string;
        title: string;
        link: string;
        faviconUrl: string;
    };
    read: boolean;
    saved: boolean;
    starred: boolean;
    seen: boolean;
    dateRead: string | null;
    dateSaved: string | null;
    dateStarred: string | null;
    dateSeen: string | null;
}

export interface StoredArticle {
    articleInfo: Article;
    content?: ArticleContent;
}

export interface ArticleContent {
    content: {
        title: string;
        content: string;
        textContent: string;
        length: number;
        excerpt: string;
        byline: string;
        dir: string;
        siteName: string;
        lang: string;
    }
}

export type Settings = {
    expTimeRead: number,
    expTimeUnread: number
}

interface SwipeDirection {
    id: string,
    name: string
    color: string,
    removeCard: boolean,
    icon: typeof Icon,
    action: (article: Article) => void
}