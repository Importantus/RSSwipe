/*
  Warnings:

  - A unique constraint covering the columns `[link]` on the table `Article` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Article_link_key` ON `Article`(`link`);
