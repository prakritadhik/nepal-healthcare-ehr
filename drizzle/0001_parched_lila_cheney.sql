CREATE TABLE `patient_charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`description` varchar(180) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'NPR',
	`status` enum('unpaid','partially_paid','paid','voided') NOT NULL DEFAULT 'unpaid',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacy_dispensations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prescriptionOrderId` int NOT NULL,
	`pharmacyOrganizationId` int NOT NULL,
	`patientId` int NOT NULL,
	`pharmacistUserId` int NOT NULL,
	`dispensedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('completed','reversed') NOT NULL DEFAULT 'completed',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pharmacy_dispensations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacy_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`medicineName` varchar(180) NOT NULL,
	`genericName` varchar(180),
	`strength` varchar(80),
	`unit` varchar(40) NOT NULL DEFAULT 'tablet',
	`batchNumber` varchar(80),
	`quantityOnHand` int NOT NULL DEFAULT 0,
	`reorderLevel` int NOT NULL DEFAULT 10,
	`expiryDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pharmacy_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescription_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prescriptionOrderId` int NOT NULL,
	`medicineName` varchar(180) NOT NULL,
	`strength` varchar(80),
	`dosage` varchar(120),
	`duration` varchar(120),
	`quantity` int NOT NULL,
	`instructions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prescription_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescription_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`prescriberUserId` int NOT NULL,
	`prescriptionNumber` varchar(64) NOT NULL,
	`notes` text,
	`sourceDocumentKey` varchar(512),
	`status` enum('draft','issued','partially_dispensed','dispensed','cancelled') NOT NULL DEFAULT 'draft',
	`issuedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prescription_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `prescription_orders_prescriptionNumber_unique` UNIQUE(`prescriptionNumber`)
);
--> statement-breakpoint
CREATE TABLE `supplier_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`contactName` varchar(120),
	`phone` varchar(40),
	`email` varchar(320),
	`address` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplyOrderId` int NOT NULL,
	`medicineName` varchar(180) NOT NULL,
	`quantityRequested` int NOT NULL,
	`quantityReceived` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supply_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pharmacyOrganizationId` int NOT NULL,
	`supplierProfileId` int NOT NULL,
	`orderNumber` varchar(64) NOT NULL,
	`status` enum('requested','confirmed','in_transit','received','cancelled') NOT NULL DEFAULT 'requested',
	`requestedById` int NOT NULL,
	`confirmedById` int,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supply_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `supply_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
ALTER TABLE `organization_invites` MODIFY COLUMN `role` enum('management','hospital_admin','doctor','nurse','receptionist','laboratory_user','radiology_user','pharmacy_user','supplier_user','auditor','patient') NOT NULL;--> statement-breakpoint
ALTER TABLE `organization_members` MODIFY COLUMN `role` enum('management','hospital_admin','doctor','nurse','receptionist','laboratory_user','radiology_user','pharmacy_user','supplier_user','auditor','patient') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','management') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `patient_charges` ADD CONSTRAINT `patient_charges_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_charges` ADD CONSTRAINT `patient_charges_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_charges` ADD CONSTRAINT `patient_charges_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_charges` ADD CONSTRAINT `patient_charges_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensations` ADD CONSTRAINT `pharmacy_dispensations_prescriptionOrderId_prescription_orders_id_fk` FOREIGN KEY (`prescriptionOrderId`) REFERENCES `prescription_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensations` ADD CONSTRAINT `pharmacy_dispensations_pharmacyOrganizationId_organizations_id_fk` FOREIGN KEY (`pharmacyOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensations` ADD CONSTRAINT `pharmacy_dispensations_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensations` ADD CONSTRAINT `pharmacy_dispensations_pharmacistUserId_users_id_fk` FOREIGN KEY (`pharmacistUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_inventory` ADD CONSTRAINT `pharmacy_inventory_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescription_items` ADD CONSTRAINT `prescription_items_prescriptionOrderId_prescription_orders_id_fk` FOREIGN KEY (`prescriptionOrderId`) REFERENCES `prescription_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescription_orders` ADD CONSTRAINT `prescription_orders_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescription_orders` ADD CONSTRAINT `prescription_orders_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescription_orders` ADD CONSTRAINT `prescription_orders_appointmentId_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescription_orders` ADD CONSTRAINT `prescription_orders_prescriberUserId_users_id_fk` FOREIGN KEY (`prescriberUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_profiles` ADD CONSTRAINT `supplier_profiles_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_order_items` ADD CONSTRAINT `supply_order_items_supplyOrderId_supply_orders_id_fk` FOREIGN KEY (`supplyOrderId`) REFERENCES `supply_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_orders` ADD CONSTRAINT `supply_orders_pharmacyOrganizationId_organizations_id_fk` FOREIGN KEY (`pharmacyOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_orders` ADD CONSTRAINT `supply_orders_supplierProfileId_supplier_profiles_id_fk` FOREIGN KEY (`supplierProfileId`) REFERENCES `supplier_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_orders` ADD CONSTRAINT `supply_orders_requestedById_users_id_fk` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supply_orders` ADD CONSTRAINT `supply_orders_confirmedById_users_id_fk` FOREIGN KEY (`confirmedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pharmacy_inventory_org_medicine_idx` ON `pharmacy_inventory` (`organizationId`,`medicineName`);