-- User defined categories that group the feeds a user follows (not to be confused with `Category`, the article classification).
CREATE TABLE IF NOT EXISTS `FeedCategory` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT 'amber',
  `position` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `FeedCategory_userId_name_key` (`userId`,`name`),
  CONSTRAINT `FeedCategory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A feed may belong to several categories of the same user. Memberships go away with the category or the feed.
CREATE TABLE IF NOT EXISTS `FeedCategoryFeed` (
  `categoryId` varchar(191) NOT NULL,
  `feedId` varchar(191) NOT NULL,
  PRIMARY KEY (`categoryId`,`feedId`),
  KEY `FeedCategoryFeed_feedId_idx` (`feedId`),
  CONSTRAINT `FeedCategoryFeed_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `FeedCategory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FeedCategoryFeed_feedId_fkey` FOREIGN KEY (`feedId`) REFERENCES `Feed` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
