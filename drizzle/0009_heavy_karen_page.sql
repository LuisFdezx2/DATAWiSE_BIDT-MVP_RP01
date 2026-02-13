CREATE TABLE `cobie_assemblies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`description` text,
	`assembly_type` varchar(255),
	`parent_name` varchar(255),
	`child_names` text,
	`ext_attributes` text,
	CONSTRAINT `cobie_assemblies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_attributes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`sheet_name` varchar(255),
	`row_name` varchar(255),
	`value` text,
	`unit` varchar(255),
	`allowed_values` text,
	`description` text,
	CONSTRAINT `cobie_attributes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type_id` int NOT NULL,
	`space_id` int,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`description` text,
	`serial_number` varchar(255),
	`installation_date` timestamp,
	`warranty_start_date` timestamp,
	`bar_code` varchar(255),
	`asset_identifier` varchar(255),
	`ifc_guid` varchar(255),
	`ifc_element_id` int,
	`ext_attributes` text,
	CONSTRAINT `cobie_components_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`description` text,
	`connection_type` varchar(255),
	`component1` varchar(255),
	`component2` varchar(255),
	`realizing_element1` varchar(255),
	`realizing_element2` varchar(255),
	`ext_attributes` text,
	CONSTRAINT `cobie_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_coordinates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`sheet_name` varchar(255),
	`row_name` varchar(255),
	`coordinate_x` varchar(255),
	`coordinate_y` varchar(255),
	`coordinate_z` varchar(255),
	`axis_x` varchar(255),
	`axis_y` varchar(255),
	`axis_z` varchar(255),
	`description` text,
	CONSTRAINT `cobie_coordinates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`description` text,
	`reference_sheet` varchar(255),
	`reference_name` varchar(255),
	`document_url` varchar(512),
	`directory` varchar(512),
	`file` varchar(255),
	`ext_attributes` text,
	CONSTRAINT `cobie_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_facilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`description` text,
	`project_phase` varchar(255),
	`site_name` varchar(255),
	`linear_units` varchar(50),
	`area_units` varchar(50),
	`volume_units` varchar(50),
	`currency_unit` varchar(50),
	`area_measurement` varchar(255),
	`ext_attributes` text,
	`imported_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cobie_facilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_floors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`description` text,
	`elevation` varchar(255),
	`height` varchar(255),
	`ext_attributes` text,
	CONSTRAINT `cobie_floors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`description` text,
	`status` varchar(255),
	`task_category` varchar(255),
	`frequency` varchar(255),
	`frequency_unit` varchar(50),
	`start` timestamp,
	`task_duration` varchar(255),
	`duration_unit` varchar(50),
	`resources` text,
	`ext_attributes` text,
	CONSTRAINT `cobie_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`email` varchar(255),
	`phone` varchar(255),
	`department` varchar(255),
	`organization_code` varchar(255),
	`street` varchar(255),
	`city` varchar(255),
	`postal_code` varchar(50),
	`country` varchar(255),
	`ext_attributes` text,
	CONSTRAINT `cobie_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_spaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`floor_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`description` text,
	`gross_area` varchar(255),
	`net_area` varchar(255),
	`usable_height` varchar(255),
	`ext_attributes` text,
	CONSTRAINT `cobie_spaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_spare_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`description` text,
	`suppliers` text,
	`part_number` varchar(255),
	`quantity` int,
	`ext_attributes` text,
	CONSTRAINT `cobie_spare_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_systems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`description` text,
	`component_names` text,
	`ext_attributes` text,
	CONSTRAINT `cobie_systems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`description` text,
	`asset_type` varchar(255),
	`manufacturer` varchar(255),
	`model_number` varchar(255),
	`warranty_guarantor_parts` varchar(255),
	`warranty_duration_parts` varchar(255),
	`warranty_guarantor_labor` varchar(255),
	`warranty_duration_labor` varchar(255),
	`expected_life` varchar(255),
	`duration_unit` varchar(50),
	`replacement_cost` varchar(255),
	`warranty_description` text,
	`ext_attributes` text,
	CONSTRAINT `cobie_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cobie_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facility_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_on` timestamp,
	`created_by` varchar(255),
	`category` varchar(255),
	`description` text,
	`space_names` text,
	`ext_attributes` text,
	CONSTRAINT `cobie_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cobie_assemblies` ADD CONSTRAINT `cobie_assemblies_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_attributes` ADD CONSTRAINT `cobie_attributes_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_components` ADD CONSTRAINT `cobie_components_type_id_cobie_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `cobie_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_components` ADD CONSTRAINT `cobie_components_space_id_cobie_spaces_id_fk` FOREIGN KEY (`space_id`) REFERENCES `cobie_spaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_components` ADD CONSTRAINT `cobie_components_ifc_element_id_ifc_elements_id_fk` FOREIGN KEY (`ifc_element_id`) REFERENCES `ifc_elements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_connections` ADD CONSTRAINT `cobie_connections_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_coordinates` ADD CONSTRAINT `cobie_coordinates_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_documents` ADD CONSTRAINT `cobie_documents_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_facilities` ADD CONSTRAINT `cobie_facilities_project_id_bim_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `bim_projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_floors` ADD CONSTRAINT `cobie_floors_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_jobs` ADD CONSTRAINT `cobie_jobs_type_id_cobie_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `cobie_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_resources` ADD CONSTRAINT `cobie_resources_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_spaces` ADD CONSTRAINT `cobie_spaces_floor_id_cobie_floors_id_fk` FOREIGN KEY (`floor_id`) REFERENCES `cobie_floors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_spare_parts` ADD CONSTRAINT `cobie_spare_parts_type_id_cobie_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `cobie_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_systems` ADD CONSTRAINT `cobie_systems_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_types` ADD CONSTRAINT `cobie_types_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cobie_zones` ADD CONSTRAINT `cobie_zones_facility_id_cobie_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `cobie_facilities`(`id`) ON DELETE no action ON UPDATE no action;