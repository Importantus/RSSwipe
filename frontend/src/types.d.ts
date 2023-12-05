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