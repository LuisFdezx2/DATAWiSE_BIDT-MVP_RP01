CREATE TABLE `bim_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`owner_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bim_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ifc_elements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`express_id` int NOT NULL,
	`ifc_type` varchar(100) NOT NULL,
	`name` varchar(255),
	`global_id` varchar(22),
	`properties` text,
	`bsdd_classifications` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ifc_elements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ifc_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`ifc_file_key` varchar(512) NOT NULL,
	`ifc_file_url` text NOT NULL,
	`fragments_key` varchar(512),
	`fragments_url` text,
	`ifc_schema` varchar(50),
	`processing_status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`quality_score` int,
	`element_count` int,
	`file_size` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ifc_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_id` int NOT NULL,
	`model_id` int,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`logs` text,
	`results` text,
	`error_message` text,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `workflow_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`flow_config` text NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bim_projects` ADD CONSTRAINT `bim_projects_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ifc_elements` ADD CONSTRAINT `ifc_elements_model_id_ifc_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `ifc_models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ifc_models` ADD CONSTRAINT `ifc_models_project_id_bim_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `bim_projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_workflow_id_workflows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_model_id_ifc_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `ifc_models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflows` ADD CONSTRAINT `workflows_project_id_bim_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `bim_projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflows` ADD CONSTRAINT `workflows_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;