-- Realistic-ish data for the migration test, including the edge cases the schema allows.
SET SESSION max_recursive_iterations = 20000;

INSERT INTO Category (id, name) SELECT UUID(), CONCAT('Category ', n) FROM (WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM s WHERE n<5) SELECT n FROM s) t;

-- 60 users; legacy bcrypt hash of "legacy-password" (created by node-bcrypt), umlauts and emoji in names
INSERT INTO User (id, name, email, password, createdAt)
SELECT CONCAT('user-', LPAD(n, 4, '0'), '-0000-0000-0000-000000000000'), CONCAT('Üser 🙂 ', n), CONCAT('User', n, '@Example.com'),
       '$2b$10$Vhy0KzRbnLh4eiI2MuJeUuOft8AEaKxlOa0p1YLEvpjbG7OYDL74y', NOW(3) - INTERVAL n DAY
FROM (WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM s WHERE n<60) SELECT n FROM s) t;

INSERT INTO Settings (id, userId, expTimeRead, expTimeUnread)
SELECT UUID(), id, 259200000, -1 FROM User;
-- a few users with two settings rows (the schema never prevented that)
INSERT INTO Settings (id, userId, expTimeRead, expTimeUnread) SELECT UUID(), id, 1000, 5000 FROM User LIMIT 5;

-- 40 feeds: some with the maximum title length of the old schema, a 900 character link, NULL optional columns
INSERT INTO Feed (id, title, link, description, faviconUrl, active, error_count, errormessage)
SELECT CONCAT('feed-', LPAD(n, 4, '0'), '-0000-0000-0000-000000000000'),
       IF(n % 7 = 0, REPEAT('T', 191), CONCAT('Feed ', n, ' äöüß')),
       IF(n % 11 = 0, CONCAT('http://example.com/', REPEAT('p', 900), n), CONCAT('http://example.com/feed', n, '.xml')),
       IF(n % 3 = 0, NULL, CONCAT('Description ', n, ' – ', REPEAT('d', 100))),
       IF(n % 4 = 0, NULL, CONCAT('http://example.com/favicon', n, '.ico')),
       n % 9 <> 0, n % 5, IF(n % 5 = 0, 'Request failed with status code 404', NULL)
FROM (WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM s WHERE n<40) SELECT n FROM s) t;

INSERT INTO FeedList (userId, feedId, openInApp)
SELECT u.id, f.id, (ASCII(RIGHT(f.id, 5)) + ASCII(RIGHT(u.id, 5))) % 2 FROM User u JOIN Feed f ON (CAST(RIGHT(SUBSTRING_INDEX(u.id,'-',2),4) AS UNSIGNED) + CAST(RIGHT(SUBSTRING_INDEX(f.id,'-',2),4) AS UNSIGNED)) % 3 = 0;

-- 3000 articles
INSERT INTO Article (id, title, link, imageUrl, createdAt, feedId, publishedAt, categoryId)
SELECT CONCAT('art-', LPAD(n, 6, '0'), '-0000-0000-0000-000000000000'),
       IF(n % 13 = 0, REPEAT('Ü', 191), CONCAT('Article ', n, ' – “quotes” & <tags>')),
       CONCAT('http://example.com/a/', n),
       IF(n % 5 = 0, NULL, CONCAT('http://example.com/img/', n, '.png')),
       NOW(3) - INTERVAL (n % 20) DAY,
       CONCAT('feed-', LPAD(1 + n % 40, 4, '0'), '-0000-0000-0000-000000000000'),
       IF(n % 17 = 0, NULL, NOW(3) - INTERVAL (n % 20) DAY - INTERVAL (n % 1440) MINUTE),
       IF(n % 6 = 0, (SELECT id FROM Category ORDER BY id LIMIT 1), NULL)
FROM (WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM s WHERE n<3000) SELECT n FROM s) t;

INSERT INTO ArticleContent (articleId, title, content, textContent, excerpt, byline, dir, siteName, lang, length, status, attempts, lastError, lastAttempt, fetchedAt)
SELECT id, title, REPEAT('<p>Hello wörld 🙂</p>', 2000), REPEAT('Hello wörld 🙂 ', 2000), 'Excerpt', NULL, 'ltr', 'Example', 'en', 30000, 'OK', 0, NULL, NULL, NOW(3)
FROM Article WHERE id LIKE '%0-0000%' LIMIT 300;
INSERT INTO ArticleContent (articleId, status, attempts, lastError, lastAttempt)
SELECT id, 'FAILED', 3, 'Parsing failed', NOW(3) FROM Article WHERE id LIKE '%1-0000%' AND id NOT IN (SELECT articleId FROM ArticleContent) LIMIT 50;

-- 8000 list entries with every flag/date combination, including NULL dates on set flags
INSERT INTO ArticleList (articleId, userId, saved, `read`, seen, starred, dateSaved, dateRead, dateSeen, dateStar)
SELECT a.id, u.id, n % 2, n % 3 = 0, n % 5 <> 0, n % 7 = 0,
       IF(n % 11 = 0, NULL, NOW(3) - INTERVAL n HOUR), IF(n % 13 = 0, NULL, NOW(3) - INTERVAL n MINUTE),
       IF(n % 17 = 0, NULL, NOW(3) - INTERVAL n SECOND), IF(n % 19 = 0, NULL, NOW(3) - INTERVAL n DAY)
FROM (WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM s WHERE n<8000) SELECT n FROM s) t
JOIN Article a ON a.id = CONCAT('art-', LPAD(1 + t.n % 3000, 6, '0'), '-0000-0000-0000-000000000000')
JOIN User u ON u.id = CONCAT('user-', LPAD(1 + (t.n DIV 3000) * 7 + t.n % 53, 4, '0'), '-0000-0000-0000-000000000000')
ON DUPLICATE KEY UPDATE saved = saved;
