-- CreateTable
CREATE TABLE `ArticleContent` (
    `articleId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(1000) NULL,
    `content` LONGTEXT NULL,
    `textContent` LONGTEXT NULL,
    `excerpt` VARCHAR(1000) NULL,
    `byline` VARCHAR(500) NULL,
    `dir` VARCHAR(10) NULL,
    `siteName` VARCHAR(255) NULL,
    `lang` VARCHAR(20) NULL,
    `length` INTEGER NULL,
    `status` ENUM('PENDING', 'OK', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(500) NULL,
    `lastAttempt` DATETIME(3) NULL,
    `fetchedAt` DATETIME(3) NULL,

    PRIMARY KEY (`articleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Article_feedId_publishedAt_idx` ON `Article`(`feedId`, `publishedAt`);

-- AddForeignKey
ALTER TABLE `ArticleContent` ADD CONSTRAINT `ArticleContent_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
