ALTER TABLE `iot_sensors` ADD `api_url` varchar(500);--> statement-breakpoint
ALTER TABLE `iot_sensors` ADD `api_type` enum('http','mqtt','simulator') DEFAULT 'simulator' NOT NULL;--> statement-breakpoint
ALTER TABLE `iot_sensors` ADD `api_key` varchar(255);--> statement-breakpoint
ALTER TABLE `iot_sensors` ADD `mqtt_topic` varchar(255);--> statement-breakpoint
ALTER TABLE `iot_sensors` ADD `mqtt_username` varchar(100);--> statement-breakpoint
ALTER TABLE `iot_sensors` ADD `mqtt_password` varchar(255);