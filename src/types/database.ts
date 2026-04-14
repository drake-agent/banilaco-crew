/**
 * BANILACO SQUAD — Database Types
 *
 * Re-exports from Drizzle schema for backward compatibility.
 * New code should import directly from '@/db/schema'.
 */

// Re-export Drizzle inferred types
import type { PinkTier as _PinkTier } from '@/db/schema/creators';
import type { OutreachEntry as _OutreachEntry } from '@/db/schema/outreach';
export type {
  Creator, NewCreator, PinkTier,
} from '@/db/schema/creators';
export { TIERS, TIER_CONFIG } from '@/db/schema/creators';

export type {
  Mission, NewMission, MissionCompletion,
} from '@/db/schema/missions';

export type {
  SampleShipment, SampleAllocationRule,
} from '@/db/schema/samples';

export type {
  ContentTrack,
} from '@/db/schema/content';

export type {
  DiscordLink,
} from '@/db/schema/discord';

export type {
  PinkLeagueSeason, PinkLeagueEntry,
} from '@/db/schema/league';

export type {
  SquadBonusEntry,
} from '@/db/schema/squad';

export type {
  EpisodicEntry, SemanticEntry, Entity, EntityRelationship,
} from '@/db/schema/memory';

export type {
  WeeklyKpi,
} from '@/db/schema/kpi';

export type {
  CreatorPayout,
} from '@/db/schema/payouts';

export type {
  JoinApplication,
} from '@/db/schema/applications';

export type {
  OutreachEntry, McnPartner,
} from '@/db/schema/outreach';

export type {
  TiktokCredential, OrderTrack,
} from '@/db/schema/tiktok';

export type {
  User,
} from '@/db/schema/auth';

// Legacy type aliases for backward compat
export type CreatorTier = _PinkTier;
export type SampleStatus = 'requested' | 'approved' | 'shipped' | 'delivered' | 'reminder_1' | 'reminder_2' | 'content_posted' | 'no_response';
export type SampleSetType = 'hero' | 'premium' | 'mini' | 'full' | 'welcome';
export type CreatorSource = 'open_collab' | 'dm_outreach' | 'mcn' | 'buyer_to_creator' | 'referral' | 'paid' | 'discord';
export type CreatorStatus = 'pending' | 'active' | 'inactive' | 'churned';
export type OutreachRecord = _OutreachEntry;
export type OutreachStatus = 'identified' | 'dm_sent' | 'responded' | 'sample_requested' | 'converted' | 'declined' | 'no_response';
export type OutreachChannel = 'tiktok_dm' | 'instagram_dm' | 'email' | 'mcn_referral';
export type OutreachTierType = 'tier_a' | 'tier_b';
