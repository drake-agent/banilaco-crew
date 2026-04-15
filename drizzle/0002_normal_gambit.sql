ALTER TABLE "order_tracking" ADD COLUMN "ordered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_tracking" ADD COLUMN "settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creator_payouts" ADD CONSTRAINT "uq_creator_payout_period" UNIQUE("creator_id","period_start","period_end");
