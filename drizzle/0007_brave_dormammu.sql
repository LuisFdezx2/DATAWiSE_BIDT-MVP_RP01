CREATE TABLE `alert_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`alert_type` enum('critical_sensor','low_success_rate','high_latency') NOT NULL,
	`threshold` int NOT NULL,
	`webhook_url` varchar(500),
	`notify_owner` boolean NOT NULL DEFAULT true,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` int NOT NULL,
	`sensor_id` int NOT NULL,
	`alert_type` enum('critical_sensor','low_success_rate','high_latency') NOT NULL,
	`message` text NOT NULL,
	`trigger_value` int NOT NULL,
	`threshold` int NOT NULL,
	`webhook_sent` boolean NOT NULL DEFAULT false,
	`owner_notified` boolean NOT NULL DEFAULT false,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `alert_configurations` ADD CONSTRAINT `alert_configurations_project_id_bim_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `bim_projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alert_history` ADD CONSTRAINT `alert_history_config_id_alert_configurations_id_fk` FOREIGN KEY (`config_id`) REFERENCES `alert_configurations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alert_history` ADD CONSTRAINT `alert_history_sensor_id_iot_sensors_id_fk` FOREIGN KEY (`sensor_id`) REFERENCES `iot_sensors`(`id`) ON DELETE no action ON UPDATE no action;