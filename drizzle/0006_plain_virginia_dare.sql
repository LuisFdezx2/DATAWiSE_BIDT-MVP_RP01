CREATE TABLE `sensor_connection_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sensor_id` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`success` boolean NOT NULL,
	`latency_ms` int,
	`error_message` text,
	`source` enum('api','fallback') NOT NULL,
	CONSTRAINT `sensor_connection_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sensor_connection_logs` ADD CONSTRAINT `sensor_connection_logs_sensor_id_iot_sensors_id_fk` FOREIGN KEY (`sensor_id`) REFERENCES `iot_sensors`(`id`) ON DELETE no action ON UPDATE no action;