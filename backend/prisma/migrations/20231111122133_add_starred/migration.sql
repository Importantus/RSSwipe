/*
  Warnings:

  - Made the column `saved` on table `ArticleList` required. This step will fail if there are existing NULL values in that column.
  - Made the column `read` on table `ArticleList` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ArticleList` ADD COLUMN `dateSeen` DATETIME(3) NULL,
    ADD COLUMN `dateStar` DATETIME(3) NULL,
    ADD COLUMN `seen` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `starred` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `saved` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `read` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `FeedList` ADD COLUMN `followedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
