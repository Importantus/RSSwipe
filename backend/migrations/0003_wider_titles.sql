-- Titles longer than 191 characters used to be rejected by the database (articles were silently dropped).
ALTER TABLE `Article` MODIFY `title` varchar(1000) NOT NULL;
ALTER TABLE `Feed` MODIFY `title` varchar(1000) NOT NULL;
