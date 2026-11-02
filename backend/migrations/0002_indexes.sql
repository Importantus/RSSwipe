-- Indexes for the real access patterns: per-user lists, retention jobs, duplicate detection.
CREATE INDEX IF NOT EXISTS `ArticleList_userId_saved_idx` ON `ArticleList` (`userId`, `saved`);
CREATE INDEX IF NOT EXISTS `ArticleList_userId_starred_idx` ON `ArticleList` (`userId`, `starred`);
CREATE INDEX IF NOT EXISTS `Article_publishedAt_idx` ON `Article` (`publishedAt`);
CREATE INDEX IF NOT EXISTS `Article_createdAt_idx` ON `Article` (`createdAt`);
CREATE INDEX IF NOT EXISTS `Article_feedId_link_idx` ON `Article` (`feedId`, `link`(191));
CREATE INDEX IF NOT EXISTS `ArticleContent_status_idx` ON `ArticleContent` (`status`);
