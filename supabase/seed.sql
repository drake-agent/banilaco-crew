-- ============================================
-- Banilaco Crew - Seed Data
-- Realistic mock data for Week 3 of 30K plan
-- ============================================

-- MCN Partners
INSERT INTO mcn_partners (name, type, contact_name, contact_email, monthly_retainer, commission_share, contract_start, total_creators_matched, active_creators, total_gmv, weekly_target, status) VALUES
('Trendio', 'large', 'Sarah Kim', 'sarah@trendio.ai', 8000, 5.0, '2026-02-01', 2500, 1800, 45000, 1000, 'active'),
('ShoppeDance', 'large', 'Mike Chen', 'mike@shoppedance.com', 6000, 4.5, '2026-02-01', 1800, 1200, 32000, 800, 'active'),
('Gen Z Group', 'niche', 'Emma Park', 'emma@genzgroup.co', 3000, 5.0, '2026-02-08', 800, 500, 15000, 400, 'active'),
('Insense', 'ai_platform', 'Support', 'support@insense.pro', 1500, 0, '2026-02-01', 600, 350, 8000, 300, 'active'),
('JoinBrands', 'ai_platform', 'Support', 'hello@joinbrands.com', 800, 0, '2026-02-15', 300, 180, 4000, 200, 'active');

-- Sample Creators (20 diverse creators)
INSERT INTO creators (tiktok_handle, display_name, email, follower_count, avg_views, engagement_rate, tier, source, status, mcn_name, total_gmv, monthly_gmv, total_content_count, monthly_content_count, commission_rate, joined_at, last_active_at, tags, competitor_brands) VALUES
('@skincarejunkie', 'Jessica L.', 'jessica@email.com', 285000, 45000, 4.2, 'diamond', 'paid', 'active', NULL, 28500, 8200, 24, 8, 40, '2026-02-01', '2026-03-26', ARRAY['skincare','routine'], ARRAY['Medicube','COSRX']),
('@glowwithme', 'Ashley T.', 'ashley@email.com', 152000, 28000, 3.8, 'gold', 'dm_outreach', 'active', NULL, 15200, 3800, 18, 6, 40, '2026-02-05', '2026-03-25', ARRAY['skincare','grwm'], ARRAY['Beauty of Joseon']),
('@kbeautyqueen', 'Michelle K.', 'michelle@email.com', 98000, 18000, 5.1, 'gold', 'mcn', 'active', 'Trendio', 12800, 2900, 15, 5, 40, '2026-02-08', '2026-03-26', ARRAY['kbeauty','review'], ARRAY['Anua','Torriden']),
('@asmrskincare', 'Sarah M.', 'sarah@email.com', 320000, 60000, 3.5, 'gold', 'paid', 'active', NULL, 18500, 4200, 12, 4, 40, '2026-02-01', '2026-03-24', ARRAY['asmr','skincare'], ARRAY['COSRX']),
('@beautybymia', 'Mia W.', 'mia@email.com', 45000, 8000, 4.8, 'silver', 'open_collab', 'active', NULL, 3200, 850, 10, 6, 35, '2026-02-10', '2026-03-26', ARRAY['makeup','skincare'], ARRAY[]),
('@routinequeen', 'Emily R.', 'emily@email.com', 67000, 12000, 3.9, 'silver', 'dm_outreach', 'active', NULL, 4500, 1200, 12, 7, 35, '2026-02-12', '2026-03-25', ARRAY['routine','morning'], ARRAY['Medicube']),
('@skinwithkim', 'Kim H.', 'kim@email.com', 38000, 7000, 4.5, 'silver', 'mcn', 'active', 'Gen Z Group', 2800, 680, 8, 5, 35, '2026-02-15', '2026-03-24', ARRAY['skincare'], ARRAY['COSRX']),
('@cleanbeautylife', 'Olivia P.', 'olivia@email.com', 28000, 5200, 5.2, 'bronze', 'open_collab', 'active', NULL, 1200, 420, 6, 3, 30, '2026-02-18', '2026-03-23', ARRAY['clean','wellness'], ARRAY[]),
('@grwmwithnat', 'Natalie C.', 'nat@email.com', 55000, 9500, 4.1, 'bronze', 'dm_outreach', 'active', NULL, 800, 320, 4, 2, 30, '2026-02-20', '2026-03-22', ARRAY['grwm','daily'], ARRAY['Beauty of Joseon']),
('@glasskinvibes', 'Luna J.', 'luna@email.com', 72000, 14000, 3.6, 'bronze', 'mcn', 'active', 'ShoppeDance', 1500, 550, 5, 3, 30, '2026-03-01', '2026-03-25', ARRAY['glassskin','korean'], ARRAY['Anua']),
('@tiktokskincare', 'Amy Z.', 'amy@email.com', 18000, 3500, 4.7, 'bronze', 'open_collab', 'active', NULL, 400, 180, 3, 2, 30, '2026-03-05', '2026-03-20', ARRAY['skincare'], ARRAY[]),
('@beautyhaul101', 'Rachel B.', 'rachel@email.com', 95000, 16000, 3.3, 'bronze', 'buyer_to_creator', 'active', NULL, 600, 250, 3, 1, 30, '2026-03-08', '2026-03-19', ARRAY['haul','unboxing'], ARRAY[]),
('@skincarenoob', 'Taylor S.', 'taylor@email.com', 12000, 2200, 5.5, 'bronze', 'open_collab', 'pending', NULL, 0, 0, 0, 0, 30, '2026-03-20', NULL, ARRAY['beginner'], ARRAY[]),
('@makeupbydani', 'Danielle F.', 'dani@email.com', 42000, 7800, 4.0, 'bronze', 'mcn', 'pending', 'Insense', 0, 0, 0, 0, 30, '2026-03-22', NULL, ARRAY['makeup'], ARRAY['Rare Beauty']),
('@wellnesswarrior', 'Grace L.', 'grace@email.com', 8000, 1500, 6.2, 'bronze', 'referral', 'pending', NULL, 0, 0, 0, 0, 30, '2026-03-24', NULL, ARRAY['wellness','lifestyle'], ARRAY[]),
('@kbeautyfinds', 'Hannah Y.', 'hannah@email.com', 135000, 22000, 3.7, 'silver', 'dm_outreach', 'inactive', NULL, 2200, 0, 8, 0, 35, '2026-02-10', '2026-03-01', ARRAY['kbeauty','finds'], ARRAY['Medicube','COSRX']);

-- Sample Shipments
INSERT INTO sample_shipments (creator_id, set_type, status, tracking_number, carrier, shipped_at, delivered_at, reminder_1_sent_at, content_posted_at, content_url, content_gmv, estimated_cost, shipping_cost) VALUES
((SELECT id FROM creators WHERE tiktok_handle = '@skincarejunkie'), 'premium', 'content_posted', 'TK9281736450', 'USPS', '2026-02-02', '2026-02-05', NULL, '2026-02-08', 'https://tiktok.com/@skincarejunkie/video/1', 3200, 45, 8),
((SELECT id FROM creators WHERE tiktok_handle = '@glowwithme'), 'hero', 'content_posted', 'TK9281736451', 'USPS', '2026-02-06', '2026-02-09', NULL, '2026-02-13', 'https://tiktok.com/@glowwithme/video/1', 1800, 30, 8),
((SELECT id FROM creators WHERE tiktok_handle = '@kbeautyqueen'), 'hero', 'content_posted', 'TK9281736452', 'FedEx', '2026-02-09', '2026-02-12', NULL, '2026-02-15', 'https://tiktok.com/@kbeautyqueen/video/1', 1200, 30, 12),
((SELECT id FROM creators WHERE tiktok_handle = '@asmrskincare'), 'premium', 'content_posted', 'TK9281736453', 'USPS', '2026-02-02', '2026-02-05', NULL, '2026-02-10', 'https://tiktok.com/@asmrskincare/video/1', 4500, 45, 8),
((SELECT id FROM creators WHERE tiktok_handle = '@beautybymia'), 'hero', 'delivered', 'TK9281736454', 'USPS', '2026-03-18', '2026-03-21', '2026-03-26', NULL, NULL, 0, 30, 8),
((SELECT id FROM creators WHERE tiktok_handle = '@routinequeen'), 'hero', 'content_posted', 'TK9281736455', 'FedEx', '2026-03-10', '2026-03-13', NULL, '2026-03-17', 'https://tiktok.com/@routinequeen/video/1', 650, 30, 12),
((SELECT id FROM creators WHERE tiktok_handle = '@skinwithkim'), 'hero', 'shipped', 'TK9281736456', 'USPS', '2026-03-24', NULL, NULL, NULL, NULL, 0, 30, 8),
((SELECT id FROM creators WHERE tiktok_handle = '@cleanbeautylife'), 'mini', 'delivered', 'TK9281736457', 'USPS', '2026-03-15', '2026-03-18', '2026-03-23', NULL, NULL, 0, 15, 8),
((SELECT id FROM creators WHERE tiktok_handle = '@grwmwithnat'), 'hero', 'approved', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 30, 8),
((SELECT id FROM creators WHERE tiktok_handle = '@glasskinvibes'), 'hero', 'shipped', 'TK9281736459', 'FedEx', '2026-03-25', NULL, NULL, NULL, NULL, 0, 30, 12),
((SELECT id FROM creators WHERE tiktok_handle = '@skincarenoob'), 'mini', 'requested', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 15, 8),
((SELECT id FROM creators WHERE tiktok_handle = '@makeupbydani'), 'hero', 'requested', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 30, 8);

-- Outreach Pipeline
INSERT INTO outreach_pipeline (tiktok_handle, display_name, outreach_tier, status, channel, source_competitor, competitor_gmv, follower_count, dm_sent_at, responded_at, converted_at, dm_template_version, assigned_to) VALUES
('@medicubelover', 'Sarah J.', 'tier_a', 'converted', 'tiktok_dm', 'Medicube', 15200, 185000, '2026-02-10', '2026-02-11', '2026-02-15', 'A', 'Alex'),
('@cosrxfan', 'Jenny L.', 'tier_a', 'converted', 'tiktok_dm', 'COSRX', 8500, 92000, '2026-02-12', '2026-02-14', '2026-02-20', 'B', 'Alex'),
('@boj_review', 'Amy K.', 'tier_a', 'responded', 'instagram_dm', 'Beauty of Joseon', 6800, 78000, '2026-03-15', '2026-03-17', NULL, 'A', 'Maria'),
('@skinbyanu', 'Lisa P.', 'tier_a', 'sample_requested', 'tiktok_dm', 'Anua', 5200, 65000, '2026-03-18', '2026-03-19', NULL, 'A', 'Maria'),
('@torriden_daily', 'Kate M.', 'tier_b', 'dm_sent', 'tiktok_dm', 'Torriden', 3200, 42000, '2026-03-24', NULL, NULL, 'B', 'Alex'),
('@elfbeautystan', 'Nicole R.', 'tier_b', 'dm_sent', 'email', 'e.l.f.', 4800, 120000, '2026-03-25', NULL, NULL, 'A', 'Maria'),
('@medicube_queen', 'Sophia W.', 'tier_a', 'converted', 'tiktok_dm', 'Medicube', 22000, 210000, '2026-02-08', '2026-02-09', '2026-02-12', 'A', 'Alex'),
('@cosrx_routine', 'Emma D.', 'tier_b', 'responded', 'tiktok_dm', 'COSRX', 2800, 35000, '2026-03-20', '2026-03-22', NULL, 'B', 'Alex'),
('@kbeauty_haul', 'Chloe T.', 'tier_b', 'no_response', 'tiktok_dm', 'Beauty of Joseon', 1500, 28000, '2026-03-10', NULL, NULL, 'B', 'Maria'),
('@anua_fan', 'Zoe H.', 'tier_b', 'converted', 'email', 'Anua', 3800, 55000, '2026-02-20', '2026-02-22', '2026-02-28', 'A', 'Alex'),
('@glowrecipe_love', 'Megan S.', 'tier_a', 'declined', 'instagram_dm', 'Glow Recipe', 9200, 145000, '2026-03-05', '2026-03-07', NULL, 'A', 'Maria'),
('@skin1004fan', 'Diana C.', 'tier_b', 'identified', 'tiktok_dm', 'Skin1004', 2100, 31000, NULL, NULL, NULL, NULL, 'Alex'),
('@rarebeauty_glow', 'Isabelle F.', 'tier_b', 'identified', 'email', 'Rare Beauty', 5500, 88000, NULL, NULL, NULL, NULL, 'Maria'),
('@medicube_daily', 'Hannah B.', 'tier_a', 'converted', 'tiktok_dm', 'Medicube', 18000, 175000, '2026-02-15', '2026-02-16', '2026-02-22', 'B', 'Alex'),
('@cosrx_stan', 'Lily M.', 'tier_b', 'converted', 'tiktok_dm', 'COSRX', 4200, 48000, '2026-03-01', '2026-03-03', '2026-03-08', 'A', 'Maria');

-- Weekly KPIs (5 weeks of data)
INSERT INTO weekly_kpis (week_number, week_start, week_end, cumulative_affiliates, weekly_new_affiliates, weekly_churned, weekly_net_increase, monthly_active_creators, weekly_content_count, monthly_gmv, weekly_gmv, open_collab_new, dm_outreach_new, mcn_new, buyer_to_creator_new, referral_new, dm_sent, dm_response_rate, sample_shipped, sample_post_rate, gmv_max_daily_budget, gmv_max_total_gmv, gmv_max_roas, discord_members, weeks_to_30k) VALUES
(1, '2026-02-02', '2026-02-08', 2100, 2100, 0, 2100, 800, 45, 12000, 12000, 800, 400, 600, 50, 250, 500, 8.0, 80, 25.0, 500, 8000, 3.2, 50, 13.3),
(2, '2026-02-09', '2026-02-15', 4800, 2800, 100, 2700, 1500, 120, 35000, 23000, 1000, 600, 800, 100, 300, 1200, 10.5, 150, 32.0, 800, 22000, 4.1, 150, 9.3),
(3, '2026-02-16', '2026-02-22', 8000, 3400, 200, 3200, 2800, 250, 65000, 30000, 1200, 700, 1000, 200, 300, 1800, 12.0, 280, 38.0, 1200, 42000, 5.0, 350, 6.9),
(4, '2026-02-23', '2026-03-01', 11500, 3800, 300, 3500, 4200, 380, 105000, 40000, 1400, 800, 1100, 250, 250, 2200, 13.5, 400, 42.0, 1500, 65000, 5.5, 600, 5.3),
(5, '2026-03-02', '2026-03-08', 15200, 4100, 400, 3700, 5500, 520, 155000, 50000, 1500, 900, 1200, 300, 200, 2800, 14.2, 500, 45.0, 1800, 92000, 5.8, 900, 4.0);

-- Weekly Challenges
INSERT INTO weekly_challenges (title, description, prize_amount, prize_description, start_date, end_date, status) VALUES
('Highest GMV of the Week', 'Creator who generates the highest GMV this week wins!', 500, '$500 cash bonus', '2026-03-23', '2026-03-29', 'active'),
('Refer 3 New Creators', 'Refer 3 new creators to earn an extra sample set', 0, 'Extra premium sample set', '2026-03-23', '2026-03-29', 'active'),
('Most Creative Hook', 'Submit your most creative video hook — team picks the winner!', 300, '$300 cash bonus', '2026-03-16', '2026-03-22', 'completed');

-- Join Applications
INSERT INTO join_applications (tiktok_handle, display_name, email, follower_count, content_categories, why_join, competitor_experience, status) VALUES
('@newcreator1', 'Sophia A.', 'sophia@email.com', 15000, ARRAY['Skincare','GRWM'], 'Love K-beauty and want to share with my audience!', ARRAY['COSRX'], 'pending'),
('@beautyreview99', 'Megan T.', 'megan@email.com', 8000, ARRAY['Skincare','Makeup'], 'Looking for new brands to review', ARRAY['Medicube','Anua'], 'pending'),
('@lifestyleluna', 'Luna S.', 'luna.s@email.com', 32000, ARRAY['Lifestyle','Wellness'], 'Big fan of banila co products!', ARRAY[], 'approved'),
('@tiktokbeauty22', 'Aria J.', 'aria@email.com', 5000, ARRAY['ASMR','Skincare'], 'Want to try TikTok Shop affiliate', ARRAY[], 'pending');
