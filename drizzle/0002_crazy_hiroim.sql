CREATE TABLE `try_on_usage` (
	`user_id` text NOT NULL,
	`usage_day` text NOT NULL,
	`generation_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `usage_day`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `try_on_usage_day_idx` ON `try_on_usage` (`usage_day`);