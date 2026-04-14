CREATE TABLE "join_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tiktok_handle" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"instagram_handle" text,
	"follower_count" text,
	"content_categories" jsonb DEFAULT '[]'::jsonb,
	"why_join" text,
	"brand_experience" jsonb DEFAULT '[]'::jsonb,
	"squad_code" text,
	"status" text DEFAULT 'pending',
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"role" text DEFAULT 'user',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationTokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationTokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "content_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"video_id" text,
	"video_url" text,
	"posted_at" timestamp with time zone,
	"detected_at" timestamp with time zone DEFAULT now(),
	"views" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"gmv_attributed" numeric(10, 2) DEFAULT '0',
	"ctr" numeric(5, 4),
	"cvr" numeric(5, 4),
	"content_type" text,
	"hook_type" text,
	"sku_featured" jsonb DEFAULT '[]'::jsonb,
	"is_spark_ad" boolean DEFAULT false,
	"spark_ad_code" text,
	"shipment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_content_video_id" UNIQUE("video_id")
);
--> statement-breakpoint
CREATE TABLE "creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tiktok_handle" text NOT NULL,
	"tiktok_id" text,
	"tiktok_user_id" text,
	"display_name" text,
	"email" text,
	"instagram_handle" text,
	"tier" text DEFAULT 'pink_petal' NOT NULL,
	"commission_rate" numeric(5, 4) DEFAULT '0.1000',
	"tier_updated_at" timestamp with time zone,
	"mission_count" integer DEFAULT 0 NOT NULL,
	"pink_score" numeric(10, 2) DEFAULT '0',
	"ai_profile_completed" boolean DEFAULT false,
	"flat_fee_earned" numeric(10, 2) DEFAULT '0',
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_mission_date" text,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"squad_code" text,
	"squad_leader_id" uuid,
	"squad_bonus_rate" numeric(5, 4) DEFAULT '0',
	"follower_count" integer,
	"avg_views" integer,
	"engagement_rate" numeric(5, 4),
	"total_gmv" numeric(12, 2) DEFAULT '0',
	"monthly_gmv" numeric(12, 2) DEFAULT '0',
	"total_content_count" integer DEFAULT 0,
	"monthly_content_count" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text,
	"mcn_name" text,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"competitor_brands" jsonb DEFAULT '[]'::jsonb,
	"joined_at" timestamp with time zone DEFAULT now(),
	"last_active_at" timestamp with time zone,
	"last_content_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discord_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"discord_user_id" text NOT NULL,
	"discord_username" text,
	"linked_at" timestamp with time zone DEFAULT now(),
	"is_verified" boolean DEFAULT false,
	CONSTRAINT "discord_links_discord_user_id_unique" UNIQUE("discord_user_id")
);
--> statement-breakpoint
CREATE TABLE "daily_mission_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"active_date" date NOT NULL,
	"slot_order" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_mission_date" UNIQUE("mission_id","active_date")
);
--> statement-breakpoint
CREATE TABLE "mission_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now(),
	"reward_earned" numeric(8, 2),
	"score_earned" integer,
	"proof_url" text,
	"proof_verified" boolean DEFAULT false,
	"verification_method" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_daily_completion" UNIQUE("creator_id","mission_id")
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"reward_type" text DEFAULT 'both' NOT NULL,
	"reward_amount" numeric(8, 2) DEFAULT '0',
	"score_amount" integer DEFAULT 0,
	"required_tier" text,
	"recurrence" text DEFAULT 'daily' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"name" text NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb,
	"last_seen" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"relation" text NOT NULL,
	"weight" numeric(3, 2) DEFAULT '0.50',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "episodic_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_key" text NOT NULL,
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"thread_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "semantic_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"content_hash" text,
	"source_type" text,
	"source_id" text,
	"memory_type" text,
	"pool_id" text DEFAULT 'squad',
	"importance" numeric(3, 2) DEFAULT '0.50',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"channel_id" text,
	"user_id" text,
	"access_count" integer DEFAULT 0,
	"last_accessed" timestamp with time zone,
	"archived" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "semantic_memory_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "pink_league_daily_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"rank" integer,
	"pink_score" numeric(10, 2),
	"boost_multiplier" numeric(3, 2) DEFAULT '1.00',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_daily_snapshot" UNIQUE("season_id","creator_id","snapshot_date")
);
--> statement-breakpoint
CREATE TABLE "pink_league_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"pink_score" numeric(10, 2) DEFAULT '0',
	"gmv_score" numeric(10, 2) DEFAULT '0',
	"viral_score" numeric(10, 2) DEFAULT '0',
	"daily_rank" integer,
	"final_rank" integer,
	"is_crown_candidate" boolean DEFAULT false,
	"fan_vote_count" integer DEFAULT 0,
	"brand_review_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_season_creator" UNIQUE("season_id","creator_id")
);
--> statement-breakpoint
CREATE TABLE "pink_league_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_number" integer NOT NULL,
	"title" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"boost_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pink_league_seasons_season_number_unique" UNIQUE("season_number")
);
--> statement-breakpoint
CREATE TABLE "pink_league_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"voter_id" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_season_voter" UNIQUE("season_id","voter_id")
);
--> statement-breakpoint
CREATE TABLE "squad_bonus_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leader_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"period" text NOT NULL,
	"member_gmv" numeric(12, 2) DEFAULT '0',
	"bonus_rate" numeric(5, 4) NOT NULL,
	"bonus_amount" numeric(10, 2) DEFAULT '0',
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_squad_bonus_period" UNIQUE("leader_id","member_id","period")
);
--> statement-breakpoint
CREATE TABLE "sample_allocation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" text NOT NULL,
	"set_type" text NOT NULL,
	"sku_list" jsonb DEFAULT '[]'::jsonb,
	"auto_approve" boolean DEFAULT false,
	"cooldown_days" integer DEFAULT 90,
	"max_per_month" integer DEFAULT 50,
	"estimated_cost" numeric(8, 2),
	"estimated_shipping" numeric(8, 2),
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sample_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"set_type" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"tracking_number" text,
	"carrier" text,
	"aftership_id" text,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"content_posted_at" timestamp with time zone,
	"content_url" text,
	"content_gmv" numeric(10, 2),
	"sku_list" jsonb DEFAULT '[]'::jsonb,
	"estimated_cost" numeric(8, 2),
	"shipping_cost" numeric(8, 2),
	"product_ids" jsonb DEFAULT '[]'::jsonb,
	"allocation_rule_id" uuid,
	"notes" text,
	"reminder_1_sent_at" timestamp with time zone,
	"reminder_2_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"prize_amount" numeric(8, 2),
	"prize_description" text,
	"winner_creator_id" uuid,
	"status" text DEFAULT 'active',
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_starting" date NOT NULL,
	"cumulative_affiliates" integer DEFAULT 0,
	"weekly_new_affiliates" integer DEFAULT 0,
	"churned" integer DEFAULT 0,
	"net_increase" integer DEFAULT 0,
	"monthly_gmv" numeric(12, 2),
	"open_collab_new" integer DEFAULT 0,
	"dm_outreach_new" integer DEFAULT 0,
	"mcn_new" integer DEFAULT 0,
	"buyer_to_creator_new" integer DEFAULT 0,
	"referral_new" integer DEFAULT 0,
	"paid_new" integer DEFAULT 0,
	"discord_new" integer DEFAULT 0,
	"dm_response_rate" numeric(5, 4),
	"sample_post_rate" numeric(5, 4),
	"sample_shipped" integer DEFAULT 0,
	"weeks_to_30k" numeric(6, 1),
	"tier_breakdown" jsonb DEFAULT '{}'::jsonb,
	"gmv_max_daily_budget" numeric(10, 2),
	"gmv_max_total_gmv" numeric(12, 2),
	"gmv_max_roas" numeric(6, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_order_id" text NOT NULL,
	"creator_id" uuid,
	"order_status" text,
	"gmv_amount" numeric(10, 2),
	"synced_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "order_tracking_shop_order_id_unique" UNIQUE("shop_order_id")
);
--> statement-breakpoint
CREATE TABLE "tiktok_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" text NOT NULL,
	"shop_name" text,
	"shop_cipher" text,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tiktok_credentials_shop_id_unique" UNIQUE("shop_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"shop_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"processing_status" text DEFAULT 'pending',
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cron_sync_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_type" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_cursor" text,
	"status" text DEFAULT 'idle',
	"run_count" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cron_sync_state_sync_type_unique" UNIQUE("sync_type")
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_type" text NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "creator_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_gmv" numeric(12, 2) DEFAULT '0',
	"commission_rate" numeric(5, 4),
	"commission_amount" numeric(10, 2) DEFAULT '0',
	"flat_fee_amount" numeric(10, 2) DEFAULT '0',
	"squad_bonus_amount" numeric(10, 2) DEFAULT '0',
	"league_bonus_amount" numeric(10, 2) DEFAULT '0',
	"bonus_amount" numeric(10, 2) DEFAULT '0',
	"total_payout" numeric(10, 2) DEFAULT '0',
	"status" text DEFAULT 'pending',
	"paid_at" timestamp with time zone,
	"payment_method" text,
	"payment_reference" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mcn_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"contact_name" text,
	"contact_email" text,
	"monthly_retainer" numeric(10, 2),
	"commission_share" numeric(5, 4),
	"total_creators_matched" integer DEFAULT 0,
	"active_creators" integer DEFAULT 0,
	"total_gmv" numeric(12, 2) DEFAULT '0',
	"weekly_target" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outreach_pipeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tiktok_handle" text NOT NULL,
	"display_name" text,
	"email" text,
	"instagram_handle" text,
	"follower_count" integer,
	"engagement_rate" numeric(5, 4),
	"outreach_tier" text,
	"status" text DEFAULT 'identified',
	"channel" text,
	"source_brand" text,
	"dm_sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"creator_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_tracking" ADD CONSTRAINT "content_tracking_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_links" ADD CONSTRAINT "discord_links_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_mission_schedule" ADD CONSTRAINT "daily_mission_schedule_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_completions" ADD CONSTRAINT "mission_completions_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_completions" ADD CONSTRAINT "mission_completions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pink_league_daily_snapshots" ADD CONSTRAINT "pink_league_daily_snapshots_season_id_pink_league_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."pink_league_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pink_league_daily_snapshots" ADD CONSTRAINT "pink_league_daily_snapshots_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pink_league_entries" ADD CONSTRAINT "pink_league_entries_season_id_pink_league_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."pink_league_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pink_league_entries" ADD CONSTRAINT "pink_league_entries_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pink_league_votes" ADD CONSTRAINT "pink_league_votes_season_id_pink_league_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."pink_league_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pink_league_votes" ADD CONSTRAINT "pink_league_votes_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_bonus_log" ADD CONSTRAINT "squad_bonus_log_leader_id_creators_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_bonus_log" ADD CONSTRAINT "squad_bonus_log_member_id_creators_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_shipments" ADD CONSTRAINT "sample_shipments_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_challenges" ADD CONSTRAINT "weekly_challenges_winner_creator_id_creators_id_fk" FOREIGN KEY ("winner_creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_tracking" ADD CONSTRAINT "order_tracking_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_pipeline" ADD CONSTRAINT "outreach_pipeline_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_content_creator_posted" ON "content_tracking" USING btree ("creator_id","posted_at");--> statement-breakpoint
CREATE INDEX "idx_entity_type_id" ON "entities" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_rel_source" ON "entity_relationships" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_rel_target" ON "entity_relationships" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_episodic_conv_key" ON "episodic_memory" USING btree ("conversation_key");--> statement-breakpoint
CREATE INDEX "idx_episodic_user" ON "episodic_memory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_episodic_channel" ON "episodic_memory" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_episodic_created" ON "episodic_memory" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_semantic_pool" ON "semantic_memory" USING btree ("pool_id");--> statement-breakpoint
CREATE INDEX "idx_semantic_type" ON "semantic_memory" USING btree ("memory_type");--> statement-breakpoint
CREATE INDEX "idx_semantic_archived" ON "semantic_memory" USING btree ("archived");