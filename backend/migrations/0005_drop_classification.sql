-- The article classification was removed: drop the category of articles and the `Category` table.
-- Irreversible. User defined categories live in `FeedCategory` (0004).
ALTER TABLE `Article` DROP FOREIGN KEY IF EXISTS `Article_categoryId_fkey`;
ALTER TABLE `Article` DROP INDEX IF EXISTS `Article_categoryId_fkey`;
ALTER TABLE `Article` DROP COLUMN IF EXISTS `categoryId`;
DROP TABLE IF EXISTS `Category`;
