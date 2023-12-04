-- DropForeignKey
ALTER TABLE `ArticleList` DROP FOREIGN KEY `ArticleList_articleId_fkey`;

-- AlterTable
ALTER TABLE `Feed` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE `ArticleList` ADD CONSTRAINT `ArticleList_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
