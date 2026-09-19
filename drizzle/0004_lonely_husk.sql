CREATE TABLE `login_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`challengeToken` varchar(96) NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` varchar(512),
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_challenges_challengeToken_unique` UNIQUE(`challengeToken`)
);
--> statement-breakpoint
CREATE TABLE `trusted_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceHash` varchar(128) NOT NULL,
	`ipAddress` varchar(64) NOT NULL,
	`userAgent` varchar(512),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trusted_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `trusted_device_user_hash_unique` UNIQUE(`userId`,`deviceHash`)
);
--> statement-breakpoint
ALTER TABLE `diagnostic_orders` ADD `resultDocumentKey` varchar(512);--> statement-breakpoint
ALTER TABLE `diagnostic_orders` ADD `performedByUserId` int;--> statement-breakpoint
ALTER TABLE `diagnostic_orders` ADD `performedAt` timestamp;--> statement-breakpoint
ALTER TABLE `encounters` ADD `severity` enum('stable','needs_follow_up','urgent','critical') DEFAULT 'stable' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounters` ADD `carePlan` text;--> statement-breakpoint
ALTER TABLE `encounters` ADD `followUpInstructions` text;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensations` ADD `quantityDispensed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `prescription_items` ADD `dispensingMode` enum('one_time','regular') DEFAULT 'one_time' NOT NULL;--> statement-breakpoint
ALTER TABLE `prescription_items` ADD `refillLimit` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `prescription_items` ADD `refillsUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `login_challenges` ADD CONSTRAINT `login_challenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trusted_devices` ADD CONSTRAINT `trusted_devices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_orders` ADD CONSTRAINT `diagnostic_orders_performedByUserId_users_id_fk` FOREIGN KEY (`performedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;