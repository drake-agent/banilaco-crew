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

test('mission completion rejects active missions that are not scheduled today', () => {
  const route = read('src/app/api/missions/complete/route.ts');
  const scheduleGateIndex = route.indexOf('if (!scheduleEntry)');
  const rewardInsertIndex = route.indexOf('.insert(missionCompletions)');

  assert.notEqual(scheduleGateIndex, -1);
  assert.notEqual(rewardInsertIndex, -1);
  assert.ok(scheduleGateIndex < rewardInsertIndex);
  assert.match(route, /Mission is not scheduled today/);
});

test('TikTok Shop OAuth connect and callback are admin-gated', () => {
  const route = read('src/app/api/tiktok/auth/route.ts');
  const getRoute = block(route, 'export async function GET', 'export async function POST');
  const postRoute = block(route, 'export async function POST', undefined);

  assert.match(route, /verifyAdmin/);
  assert.match(getRoute, /const adminResult = await verifyAdmin\(\)/);
  assert.match(postRoute, /const adminResult = await verifyAdmin\(\)/);
});

test('order sync updates existing orders and credits GMV on settlement transition', () => {
  const orchestrator = read('src/lib/adapters/sync-orchestrator.ts');
  const schema = read('src/db/schema/tiktok.ts');

  assert.doesNotMatch(orchestrator, /if \(existing\) continue;/);
  assert.match(orchestrator, /wasSettled/);
  assert.match(orchestrator, /creditSettledOrder/);
  assert.match(orchestrator, /where\(eq\(orderTracking\.id,\s*existing\.id\)\)/);
  assert.match(schema, /orderedAt: timestamp\('ordered_at'/);
  assert.match(schema, /settledAt: timestamp\('settled_at'/);
});

test('payouts calculate commission from settled order GMV inside the payout period', () => {
  const route = read('src/app/api/payouts/route.ts');
  const schema = read('src/db/schema/payouts.ts');

  assert.match(route, /orderTracking/);
  assert.match(route, /periodGmv/);
  assert.match(route, /orderStatus,\s*'settled'/);
  assert.match(route, /COALESCE\(\$\{orderTracking\.settledAt\}/);
  assert.doesNotMatch(route, /parseFloat\(creator\.monthlyGmv/);
  assert.match(schema, /uq_creator_payout_period/);
});

test('squad join validates self-link, existing leader, active leader, and cycles', () => {
  const engine = read('src/lib/referral/referral-engine.ts');
  const route = read('src/app/api/squad/route.ts');

  assert.match(engine, /memberId === leaderId/);
  assert.match(engine, /squadLeaderId/);
  assert.match(engine, /status !== 'active'/);
  assert.match(engine, /would create a squad cycle/i);
  assert.match(route, /SquadJoinError/);
});

test('sample dashboard persists create and status changes through API calls', () => {
  const page = read('src/app/dashboard/samples/page.tsx');
  const api = read('src/app/api/samples/route.ts');

  assert.match(page, /method:\s*'POST'/);
  assert.match(page, /method:\s*'PATCH'/);
  assert.match(page, /await fetch\('\/api\/samples'/);
  assert.match(page, /fetchSamples\(\)/);
  assert.match(api, /reminder1SentAt/);
  assert.match(api, /contentPostedAt/);
});

test('reminder cron uses ReminderEngine to send and persist reminders', () => {
  const route = read('src/app/api/reminders/route.ts');

  assert.match(route, /new ReminderEngine\(createNotificationSender\(\)\)/);
  assert.match(route, /processReminders\(\)/);
  assert.doesNotMatch(route, /function processCronReminders\(\)[\s\S]*Auto-detect content posted/);
});

test('KPI dashboard coerces optional API numbers before formatting', () => {
  const page = read('src/app/dashboard/kpi/page.tsx');

  assert.match(page, /function numberValue/);
  assert.match(page, /weeklyContentCount\(latestData\)/);
  assert.match(page, /monthlyActiveCreators\(latestData\)/);
  assert.match(page, /weeklyGmv\(latestData\)/);
  assert.doesNotMatch(page, /latestData\.samplePostRate\.toFixed/);
});

test('public squad code validation bypasses auth middleware', () => {
  const middleware = read('src/middleware.ts');

  assert.match(middleware, /pathname\.startsWith\('\/api\/squad\/validate'\)/);
});

test('collab creation validates initiator content URL before storing it', () => {
  const route = read('src/app/api/collabs/route.ts');
  const postRoute = block(route, 'export async function POST', 'export async function PATCH');

  assert.match(route, /function validateHttpUrl/);
  assert.match(postRoute, /validateHttpUrl\(contentUrl\)/);
  assert.match(route, /contentUrl must use http\(s\)/);
});
