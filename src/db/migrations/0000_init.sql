CREATE TABLE `bill_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`bill_id` text NOT NULL,
	`product_id` text,
	`position` integer NOT NULL,
	`name_snapshot` text NOT NULL,
	`unit` text NOT NULL,
	`qty` real NOT NULL,
	`unit_price_paise` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bill_items_bill_idx` ON `bill_items` (`bill_id`);--> statement-breakpoint
CREATE INDEX `bill_items_product_idx` ON `bill_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`customer_id` text,
	`number` text NOT NULL,
	`total_paise` integer NOT NULL,
	`public_token` text NOT NULL,
	`voided_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bills_number_uq` ON `bills` (`number`);--> statement-breakpoint
CREATE INDEX `bills_created_idx` ON `bills` (`created_at`);--> statement-breakpoint
CREATE INDEX `bills_customer_idx` ON `bills` (`customer_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`bill_id` text NOT NULL,
	`method` text NOT NULL,
	`amount_paise` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payments_bill_idx` ON `payments` (`bill_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`barcode` text,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`price_paise` integer NOT NULL,
	`mrp_paise` integer,
	`low_stock_at` real,
	`track_stock` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_uq` ON `products` (`barcode`) WHERE barcode is not null and deleted_at is null;--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`phone` text,
	`linked_user_id` text
);
--> statement-breakpoint
CREATE TABLE `khata_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`customer_id` text NOT NULL,
	`kind` text NOT NULL,
	`delta_paise` integer NOT NULL,
	`ref_id` text
);
--> statement-breakpoint
CREATE INDEX `khata_entries_customer_idx` ON `khata_entries` (`customer_id`);--> statement-breakpoint
CREATE TABLE `shop` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`upi_id` text NOT NULL,
	`bill_prefix` text NOT NULL,
	`setup_done` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`product_id` text NOT NULL,
	`qty_delta` real NOT NULL,
	`reason` text NOT NULL,
	`ref_id` text
);
--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mutation_id` text NOT NULL,
	`table_name` text NOT NULL,
	`op` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`message` text,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_mutation_id_unique` ON `outbox` (`mutation_id`);--> statement-breakpoint
CREATE INDEX `outbox_status_idx` ON `outbox` (`status`,`id`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
