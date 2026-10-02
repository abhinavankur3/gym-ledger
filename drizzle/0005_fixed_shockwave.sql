CREATE TABLE `nutrition_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`status` text NOT NULL,
	`plan_json` text NOT NULL,
	`targets_json` text NOT NULL,
	`source` text NOT NULL,
	`cuisine` text NOT NULL,
	`feedback` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_nutrition_plans_user_status` ON `nutrition_plans` (`user_id`,`status`);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `cuisine_region` text;