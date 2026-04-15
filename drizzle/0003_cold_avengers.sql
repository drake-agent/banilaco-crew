ALTER TABLE "order_tracking" ADD COLUMN "gmv_credited_at" timestamp with time zone;--> statement-breakpoint
UPDATE "order_tracking" SET "gmv_credited_at" = COALESCE("settled_at", "synced_at", "created_at") WHERE "order_status" = 'settled' AND "gmv_credited_at" IS NULL;--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "uq_creators_tiktok_handle" UNIQUE("tiktok_handle");--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "uq_creators_squad_code" UNIQUE("squad_code");
