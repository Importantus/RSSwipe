/*
  Warnings:

  - Added the required column `publishedAt` to the `Article` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Article` ADD COLUMN `publishedAt` DATETIME(3) NOT NULL;
