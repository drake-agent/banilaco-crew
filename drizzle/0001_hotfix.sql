CREATE TABLE "collab_duos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"product_tag" text NOT NULL,
	"initiator_content_url" text,
	"partner_content_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"score_boost_pct" numeric(4, 2) DEFAULT '0.15',
	"season_id" uuid,
	"week_key" text,
	"duo_streak_count" integer DEFAULT 1,
	"is_dynamic_duo" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"matched_at" timestamp with time zone,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "daily_mission_schedule" ADD COLUMN "is_mystery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mission_completions" ADD COLUMN "mystery_multiplier" numeric(3, 1);--> statement-breakpoint
ALTER TABLE "pink_league_entries" ADD COLUMN "season_start_multiplier" numeric(3, 2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE "collab_duos" ADD CONSTRAINT "collab_duos_initiator_id_creators_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_duos" ADD CONSTRAINT "collab_duos_partner_id_creators_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_duos" ADD CONSTRAINT "collab_duos_season_id_pink_league_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."pink_league_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- M5 FIX: Replace flawed (creator_id, mission_id) unique with date-based partial unique.
-- The previous constraint blocked recurring daily missions forever after the first completion.
ALTER TABLE "mission_completions" DROP CONSTRAINT IF EXISTS "uq_daily_completion";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_mission_completion_daily"
  ON "mission_completions" ("creator_id", "mission_id", (DATE("completed_at" AT TIME ZONE 'UTC')));--> statement-breakpoint

-- H7 FIX: Indexes on frequent WHERE clauses.
CREATE INDEX IF NOT EXISTS "idx_mission_completion_creator_completed"
  ON "mission_completions" ("creator_id", "completed_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_collab_duos_initiator"
  ON "collab_duos" ("initiator_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_collab_duos_partner"
  ON "collab_duos" ("partner_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_collab_duos_season"
  ON "collab_duos" ("season_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creators_squad_leader"
  ON "creators" ("squad_leader_id") WHERE "squad_leader_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creators_status_tier"
  ON "creators" ("status", "tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daily_mission_schedule_date"
  ON "daily_mission_schedule" ("active_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payouts_creator_period"
  ON "creator_payouts" ("creator_id", "period_end" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sample_shipments_creator_status"
  ON "sample_shipments" ("creator_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_outreach_status"
  ON "outreach_pipeline" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pink_league_entries_season_rank"
  ON "pink_league_entries" ("season_id", "daily_rank");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pink_league_entries_season_final_rank"
  ON "pink_league_entries" ("season_id", "final_rank");