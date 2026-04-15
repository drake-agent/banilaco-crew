import {
  pgTable, uuid, text, integer, decimal, timestamp, jsonb,
} from 'drizzle-orm/pg-core';

export const joinApplications = pgTable('join_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tiktokHandle: text('tiktok_handle').notNull(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  instagramHandle: text('instagram_handle'),
  followerCount: text('follower_count'), // range string
  // Affiliate-signal fields — 팔로워 수보다 전환력이 중요.
  avgViews: integer('avg_views'),                                            // 최근 비디오 평균 조회수
  engagementRate: decimal('engagement_rate', { precision: 5, scale: 4 }),    // fraction (0.0523 = 5.23%)
  pastAffiliateGmv: decimal('past_affiliate_gmv', { precision: 10, scale: 2 }), // 다른 플랫폼에서 어필리에이트로 낸 누적 매출
  contentCategories: jsonb('content_categories').$type<string[]>().default([]),
  whyJoin: text('why_join'),
  brandExperience: jsonb('brand_experience').$type<string[]>().default([]),
  squadCode: text('squad_code'), // referral/squad code
  applicantScore: integer('applicant_score'), // 0-100 auto-score; set on approval
  status: text('status', {
    enum: ['pending', 'approved', 'rejected'],
  }).default('pending'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type JoinApplication = typeof joinApplications.$inferSelect;
