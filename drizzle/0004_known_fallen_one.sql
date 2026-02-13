CREATE TABLE `element_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`element_id` int NOT NULL,
	`model_id` int NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`user_name` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`parent_id` int,
	`resolved` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `element_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `element_comments` ADD CONSTRAINT `element_comments_model_id_ifc_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `ifc_models`(`id`) ON DELETE cascade ON UPDATE no action;