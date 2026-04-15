ALTER TABLE "join_applications" ADD COLUMN "avg_views" integer;--> statement-breakpoint
ALTER TABLE "join_applications" ADD COLUMN "engagement_rate" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "join_applications" ADD COLUMN "past_affiliate_gmv" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "join_applications" ADD COLUMN "applicant_score" integer;