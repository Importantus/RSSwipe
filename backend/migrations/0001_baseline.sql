-- Baseline: the schema as left behind by the 19 Prisma migrations (see docs/rust-migration/schema-reference.txt).
-- Every statement is IF NOT EXISTS, so applying it to an existing production database changes nothing.
-- Constraint and index names are the ones Prisma generated.

CREATE TABLE IF NOT EXISTS `User` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Category` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Category_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Feed` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `link` varchar(1000) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `faviconUrl` varchar(1000) DEFAULT NULL,
  `lastUpdate` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `error_count` int(11) NOT NULL DEFAULT 0,
  `errormessage` varchar(300) DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Feed_link_key` (`link`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FeedList` (
  `userId` varchar(191) NOT NULL,
  `feedId` varchar(191) NOT NULL,
  `openInApp` tinyint(1) NOT NULL DEFAULT 1,
  `followedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`userId`,`feedId`),
  KEY `FeedList_feedId_fkey` (`feedId`),
  CONSTRAINT `FeedList_feedId_fkey` FOREIGN KEY (`feedId`) REFERENCES `Feed` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `FeedList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Article` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `link` varchar(1000) NOT NULL,
  `imageUrl` varchar(1000) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `feedId` varchar(191) NOT NULL,
  `publishedAt` datetime(3) DEFAULT NULL,
  `categoryId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Article_categoryId_fkey` (`categoryId`),
  KEY `Article_feedId_publishedAt_idx` (`feedId`,`publishedAt`),
  CONSTRAINT `Article_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Article_feedId_fkey` FOREIGN KEY (`feedId`) REFERENCES `Feed` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ArticleContent` (
  `articleId` varchar(191) NOT NULL,
  `title` varchar(1000) DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `textContent` longtext DEFAULT NULL,
  `excerpt` varchar(1000) DEFAULT NULL,
  `byline` varchar(500) DEFAULT NULL,
  `dir` varchar(10) DEFAULT NULL,
  `siteName` varchar(255) DEFAULT NULL,
  `lang` varchar(20) DEFAULT NULL,
  `length` int(11) DEFAULT NULL,
  `status` enum('PENDING','OK','FAILED') NOT NULL DEFAULT 'PENDING',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `lastError` varchar(500) DEFAULT NULL,
  `lastAttempt` datetime(3) DEFAULT NULL,
  `fetchedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`articleId`),
  CONSTRAINT `ArticleContent_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Settings` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `expTimeRead` int(11) NOT NULL,
  `expTimeUnread` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Settings_userId_fkey` (`userId`),
  CONSTRAINT `Settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ArticleList` (
  `articleId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `saved` tinyint(1) NOT NULL DEFAULT 0,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `dateSaved` datetime(3) DEFAULT NULL,
  `dateRead` datetime(3) DEFAULT NULL,
  `dateSeen` datetime(3) DEFAULT NULL,
  `dateStar` datetime(3) DEFAULT NULL,
  `seen` tinyint(1) NOT NULL DEFAULT 0,
  `starred` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`articleId`,`userId`),
  KEY `ArticleList_userId_fkey` (`userId`),
  CONSTRAINT `ArticleList_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ArticleList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
