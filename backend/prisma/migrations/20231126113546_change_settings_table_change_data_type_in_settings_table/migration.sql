/*
  Warnings:

  - Changed the type of `expTimeRead` on the `Settings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `expTimeUnread` on the `Settings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE `Settings` DROP COLUMN `expTimeRead`,
    ADD COLUMN `expTimeRead` INTEGER NOT NULL,
    DROP COLUMN `expTimeUnread`,
    ADD COLUMN `expTimeUnread` INTEGER NOT NULL;
