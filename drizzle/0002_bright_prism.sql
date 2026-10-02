CREATE TABLE `user_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`goal` text NOT NULL,
	`experience` text NOT NULL,
	`age` integer NOT NULL,
	`sex` text NOT NULL,
	`height` real NOT NULL,
	`weight` real NOT NULL,
	`activity_level` text NOT NULL,
	`training_days` integer NOT NULL,
	`session_duration` integer NOT NULL,
	`equipment` text NOT NULL,
	`dietary_preferences` text DEFAULT 'none' NOT NULL,
	`restrictions` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);