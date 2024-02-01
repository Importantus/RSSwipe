-- AlterTable
ALTER TABLE `Feed` ADD COLUMN `error_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `errormessage` VARCHAR(191) NULL;
