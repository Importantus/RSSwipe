-- DropForeignKey
ALTER TABLE `ArticleList` DROP FOREIGN KEY `ArticleList_userId_fkey`;

-- DropForeignKey
ALTER TABLE `FeedList` DROP FOREIGN KEY `FeedList_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Settings` DROP FOREIGN KEY `Settings_userId_fkey`;

-- AddForeignKey
ALTER TABLE `FeedList` ADD CONSTRAINT `FeedList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Settings` ADD CONSTRAINT `Settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleList` ADD CONSTRAINT `ArticleList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
