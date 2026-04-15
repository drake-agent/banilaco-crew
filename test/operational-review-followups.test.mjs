import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

function block(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : source.length;
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('sync adapters use stored TikTok OAuth credentials and refresh expiring tokens', () => {
  const adapters = read('src/lib/adapters/index.ts');
  const syncRoute = read('src/app/api/sync/route.ts');

  assert.match(adapters, /tiktokCredentials/);
  assert.match(adapters, /TikTokAuth/);
  assert.match(adapters, /refreshAccessToken/);
  assert.match(adapters, /loadTikTokShopCredential/);
  assert.match(syncRoute, /await createAdapters\(/);
  assert.doesNotMatch(adapters, /accessToken:\s*process\.env\.TIKTOK_SHOP_ACCESS_TOKEN\s*\|\|\s*''/);
});

test('order sync catches late settlements and credits each order GMV only once', () => {
  const orchestrator = read('src/lib/adapters/sync-orchestrator.ts');
  const tiktokSchema = read('src/db/schema/tiktok.ts');
  const webhook = read('src/app/api/webhooks/tiktok/route.ts');

  assert.match(orchestrator, /UNSETTLED_ORDER_LOOKBACK_DAYS/);
  assert.match(orchestrator, /oldestUnsettled/);
  assert.match(orchestrator, /creditOrderGmvIfNeeded/);
  assert.match(tiktokSchema, /gmvCreditedAt: timestamp\('gmv_credited_at'/);
  assert.match(webhook, /130:\s*'settled'/);
  assert.match(webhook, /newStatus === 'settled'/);
  assert.match(webhook, /creditOrderGmvIfNeeded/);
});

test('proof-required missions create pending completions without immediate creator rewards', () => {
  const route = read('src/app/api/missions/complete/route.ts');

  assert.match(route, /function missionRequiresProof/);
  assert.match(route, /requiresProof/);
  assert.match(route, /proofVerified:\s*!requiresProof/);
  assert.match(route, /approvedRewardAmount/);
  assert.match(route, /pendingVerification/);
  assert.doesNotMatch(route, /verificationMethod:\s*proofUrl\s*\?\s*'manual'\s*:\s*'auto'/);
});

test('reminder engine only marks sent after a real channel succeeds', () => {
  const sender = read('src/lib/reminders/notification-sender.ts');
  const engine = read('src/lib/reminders/reminder-engine.ts');

  assert.match(sender, /new TikTokDMSender\(\)/);
  assert.match(sender, /return false/);
  assert.doesNotMatch(sender, /Composite:\s*DM via console/);
  assert.match(engine, /emailSent/);
  assert.match(engine, /if \(!dmSent && !emailSent\) continue/);
});

test('join approval is transactional and creator identity fields are unique', () => {
  const route = read('src/app/api/join/approve/route.ts');
  const schema = read('src/db/schema/creators.ts');

  assert.match(route, /db\.transaction/);
  assert.match(route, /joinApplications\.status,\s*'pending'/);
  assert.match(route, /generateUniqueSquadCode/);
  assert.match(route, /normalizeHandle/);
  assert.match(schema, /uq_creators_tiktok_handle/);
  assert.match(schema, /uq_creators_squad_code/);
});

test('league activation closes other current seasons before activating one', () => {
  const route = read('src/app/api/league/route.ts');
  const activate = block(route, "case 'activate_season':", "case 'daily_snapshot':");

  assert.match(activate, /db\.transaction/);
  assert.match(activate, /active', 'voting/);
  assert.match(activate, /status:\s*'completed'/);
  assert.match(activate, /status:\s*'active'/);
});

test('squad leaderboard requires admin or cron authorization', () => {
  const route = read('src/app/api/squad/route.ts');
  const leaderboard = block(route, "case 'leaderboard':", "case 'join':");

  assert.match(leaderboard, /verifyCronAuth/);
  assert.match(leaderboard, /verifyAdmin/);
});

test('dashboard add creator persists through the creators API', () => {
  const page = read('src/app/dashboard/creators/page.tsx');

  assert.match(page, /method:\s*'POST'/);
  assert.match(page, /fetch\('\/api\/creators'/);
  assert.match(page, /instagramHandle/);
  assert.match(page, /fetchCreators\(\)/);
  assert.doesNotMatch(page, /console\.log\('New creator:'/);
});
