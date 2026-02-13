CREATE TABLE `iot_sensors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`element_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sensor_type` varchar(50) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`min_threshold` int,
	`max_threshold` int,
	`status` enum('active','inactive','error') NOT NULL DEFAULT 'active',
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `iot_sensors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sensor_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sensor_id` int NOT NULL,
	`value` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`metadata` text,
	CONSTRAINT `sensor_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `iot_sensors` ADD CONSTRAINT `iot_sensors_element_id_ifc_elements_id_fk` FOREIGN KEY (`element_id`) REFERENCES `ifc_elements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sensor_readings` ADD CONSTRAINT `sensor_readings_sensor_id_iot_sensors_id_fk` FOREIGN KEY (`sensor_id`) REFERENCES `iot_sensors`(`id`) ON DELETE no action ON UPDATE no action;