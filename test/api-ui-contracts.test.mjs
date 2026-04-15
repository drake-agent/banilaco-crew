import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

test('dashboard creators consumes the /api/creators response key', () => {
  const api = read('src/app/api/creators/route.ts');
  const page = read('src/app/dashboard/creators/page.tsx');

  assert.match(api, /creators:\s*data/);
  assert.match(page, /setCreators\(json\.creators\s*\|\|\s*\[\]\)/);
  assert.doesNotMatch(page, /setCreators\(json\.data\s*\|\|\s*\[\]\)/);
});

test('dashboard samples creator picker consumes the /api/creators response key', () => {
  const page = read('src/app/dashboard/samples/page.tsx');

  assert.match(page, /setCreators\(json\.creators\s*\|\|\s*\[\]\)/);
  assert.doesNotMatch(page, /setCreators\(json\.data\s*\|\|\s*\[\]\)/);
});

test('shipping API returns analytics consumed by dashboard shipping', () => {
  const api = read('src/app/api/shipping/route.ts');
  const page = read('src/app/dashboard/shipping/page.tsx');

  assert.match(api, /analytics:/);
  assert.match(page, /setAnalytics\(json\.analytics\s*\|\|\s*null\)/);
});

test('creator samples route allows creator-owned sample reads', () => {
  const api = read('src/app/api/samples/route.ts');

  assert.match(api, /getCreatorFromAuth/);
  assert.match(api, /eq\(sampleShipments\.creatorId,\s*creatorResult\.creatorId\)/);
});

test('creator samples UI consumes persisted shipment fields', () => {
  const page = read('src/app/creator/samples/page.tsx');

  assert.match(page, /sample\.setType/);
  assert.match(page, /sample\.shippedAt/);
  assert.match(page, /sample\.trackingNumber/);
  assert.doesNotMatch(page, /sample\.name/);
  assert.doesNotMatch(page, /sample\.shippedDate/);
  assert.doesNotMatch(page, /sample\.tracking(?!Number)/);
});

test('sync cron checks competitor discovery before generic even-hour shipping', () => {
  const route = read('src/app/api/sync/route.ts');
  const competitorIndex = route.indexOf('hour === CRON_SCHEDULE.COMPETITOR_DISCOVERY_UTC');
  const shippingIndex = route.indexOf('hour % 2 === 0');

  assert.notEqual(competitorIndex, -1);
  assert.notEqual(shippingIndex, -1);
  assert.ok(competitorIndex < shippingIndex);
});

test('package scripts expose working typecheck and do not use removed next lint command', () => {
  const pkg = JSON.parse(read('package.json'));

  assert.equal(pkg.scripts.typecheck, 'tsc --noEmit');
  assert.notEqual(pkg.scripts.lint, 'next lint');
});
