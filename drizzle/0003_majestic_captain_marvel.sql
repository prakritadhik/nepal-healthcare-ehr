ALTER TABLE `patients` ADD `medicalNumber` varchar(32);--> statement-breakpoint
ALTER TABLE `patients` ADD `citizenshipNumber` varchar(80);--> statement-breakpoint
ALTER TABLE `patients` ADD `bloodGroup` varchar(8);--> statement-breakpoint
ALTER TABLE `patients` ADD `profilePhotoKey` varchar(512);--> statement-breakpoint
UPDATE `patients` SET `medicalNumber` = CONCAT('SFN-', LPAD(`id`, 8, '0')) WHERE `medicalNumber` IS NULL OR `medicalNumber` = '';--> statement-breakpoint
ALTER TABLE `patients` MODIFY `medicalNumber` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_medicalNumber_unique` UNIQUE (`medicalNumber`);
