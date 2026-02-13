CREATE TABLE `sensor_recovery_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sensor_id` int NOT NULL,
	`attempt_at` timestamp NOT NULL DEFAULT (now()),
	`success` boolean NOT NULL,
	`backoff_minutes` int NOT NULL,
	`error_message` text,
	`latency_ms` int,
	CONSTRAINT `sensor_recovery_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sensor_recovery_attempts` ADD CONSTRAINT `sensor_recovery_attempts_sensor_id_iot_sensors_id_fk` FOREIGN KEY (`sensor_id`) REFERENCES `iot_sensors`(`id`) ON DELETE no action ON UPDATE no action;