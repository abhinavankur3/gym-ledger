CREATE TABLE `ai_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_usage_user_kind_created` ON `ai_usage` (`user_id`,`kind`,`created_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `session_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_routine_days_routine` ON `routine_days` (`routine_id`);--> statement-breakpoint
CREATE INDEX `idx_routines_user_active` ON `routines` (`user_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_sets_exercise` ON `workout_sets` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `idx_template_exercises_template` ON `workout_template_exercises` (`template_id`);