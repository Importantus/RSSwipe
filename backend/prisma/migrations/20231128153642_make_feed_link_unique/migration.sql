/*
  Warnings:

  - A unique constraint covering the columns `[link]` on the table `Feed` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Feed_link_key` ON `Feed`(`link`);
