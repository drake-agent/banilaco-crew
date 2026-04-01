/**
 * Validate required environment variables at startup.
 * Call this from middleware or layout to catch config errors early.
 */

interface EnvCheck {
  key: string;
  required: boolean;
  group: string;
}

const ENV_CHECKS: EnvCheck[] = [
  // Core Supabase
  { key: 'NEXT_PUBLIC_SUPABASE_URL', required: true, group: 'Supabase' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, group: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', required: true, group: 'Supabase' },
  // TikTok Shop
  { key: 'TIKTOK_SHOP_APP_KEY', required: true, group: 'TikTok' },
  { key: 'TIKTOK_SHOP_APP_SECRET', required: true, group: 'TikTok' },
  // Cron
  { key: 'CRON_SECRET', required: true, group: 'Cron' },
  // Optional
  { key: 'AFTERSHIP_WEBHOOK_SECRET', required: false, group: 'Shipping' },
  { key: 'AFTERSHIP_API_KEY', required: false, group: 'Shipping' },
  { key: 'APIFY_API_TOKEN', required: false, group: 'Crawler' },
  { key: 'CRAWLER_BASE_URL', required: false, group: 'Crawler' },
  { key: 'RESEND_API_KEY', required: false, group: 'Email' },
  { key: 'DISCORD_WEBHOOK_URL', required: false, group: 'Notifications' },
];

let validated = false;

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  if (validated) return { valid: true, missing: [], warnings: [] };

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const check of ENV_CHECKS) {
    const value = process.env[check.key];
    if (!value) {
      if (check.required) {
        missing.push(`[${check.group}] ${check.key}`);
      } else {
        warnings.push(`[${check.group}] ${check.key} not set — ${check.group} features disabled`);
      }
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:\n  ' + missing.join('\n  '));
  }
  if (warnings.length > 0) {
    console.warn('⚠️  Optional environment variables not set:\n  ' + warnings.join('\n  '));
  }

  validated = true;
  return { valid: missing.length === 0, missing, warnings };
}
