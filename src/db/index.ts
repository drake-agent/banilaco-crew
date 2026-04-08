import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as creators from './schema/creators';
import * as missions from './schema/missions';
import * as memory from './schema/memory';
import * as discord from './schema/discord';
import * as samples from './schema/samples';
import * as content from './schema/content';
import * as squad from './schema/squad';
import * as league from './schema/league';
import * as kpi from './schema/kpi';
import * as tiktok from './schema/tiktok';
import * as sync from './schema/sync';
import * as auth from './schema/auth';
import * as payouts from './schema/payouts';
import * as applications from './schema/applications';
import * as outreach from './schema/outreach';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema: {
    ...creators,
    ...missions,
    ...memory,
    ...discord,
    ...samples,
    ...content,
    ...squad,
    ...league,
    ...kpi,
    ...tiktok,
    ...sync,
    ...auth,
    ...payouts,
    ...applications,
    ...outreach,
  },
});

export type Database = typeof db;
