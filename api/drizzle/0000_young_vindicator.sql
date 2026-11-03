CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`title` text NOT NULL,
	`team` text NOT NULL,
	`auth_user_id` text,
	`must_change_password` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`auth_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_email_unique` ON `agents` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `agents_auth_user_id_idx` ON `agents` (`auth_user_id`);--> statement-breakpoint
CREATE INDEX `agents_name_idx` ON `agents` (`name`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`author_kind` text NOT NULL,
	`author_name` text NOT NULL,
	`author_agent_id` text,
	`author_customer_id` text,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`author_customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ticket_messages_ticket_created_idx` ON `ticket_messages` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ticket_messages_author_agent_idx` ON `ticket_messages` (`author_agent_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_number` text NOT NULL,
	`subject` text NOT NULL,
	`description` text NOT NULL,
	`customer_id` text NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`assigned_agent_id` text NOT NULL,
	`created_by_auth_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_auth_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_ticket_number_unique` ON `tickets` (`ticket_number`);--> statement-breakpoint
CREATE INDEX `tickets_status_created_at_idx` ON `tickets` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `tickets_priority_created_at_idx` ON `tickets` (`priority`,`created_at`);--> statement-breakpoint
CREATE INDEX `tickets_customer_id_idx` ON `tickets` (`customer_id`);--> statement-breakpoint
CREATE INDEX `tickets_assigned_agent_id_idx` ON `tickets` (`assigned_agent_id`);--> statement-breakpoint
CREATE INDEX `tickets_updated_at_idx` ON `tickets` (`updated_at`);--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_name` text DEFAULT 'DeskPilot Support' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`default_priority` text DEFAULT 'Medium' NOT NULL,
	`owner_auth_user_id` text,
	`next_ticket_number` integer DEFAULT 1042 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_auth_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
