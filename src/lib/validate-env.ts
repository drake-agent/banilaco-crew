/**
 * Validate required environment variables at startup.
 * Updated for BANILACO SQUAD (PostgreSQL + NextAuth + Discord).
 */

interface EnvCheck {
  key: string;
  required: boolean;
  group: string;
}

const ENV_CHECKS: EnvCheck[] = [
  // Database
  { key: 'DATABASE_URL', required: true, group: 'Database' },
  // NextAuth
  { key: 'NEXTAUTH_SECRET', required: true, group: 'Auth' },
  { key: 'NEXTAUTH_URL', required: true, group: 'Auth' },
  // Discord
  { key: 'DISCORD_CLIENT_ID', required: true, group: 'Discord' },
  { key: 'DISCORD_CLIENT_SECRET', required: true, group: 'Discord' },
  { key: 'DISCORD_BOT_TOKEN', required: false, group: 'Discord Bot' },
  { key: 'DISCORD_GUILD_ID', required: false, group: 'Discord Bot' },
  // TikTok Shop
  { key: 'TIKTOK_SHOP_APP_KEY', required: true, group: 'TikTok' },
  { key: 'TIKTOK_SHOP_APP_SECRET', required: true, group: 'TikTok' },
  // Cron
  { key: 'CRON_SECRET', required: true, group: 'Cron' },
  // AI
  { key: 'ANTHROPIC_API_KEY', required: false, group: 'AI' },
  // Optional
  { key: 'AFTERSHIP_WEBHOOK_SECRET', required: false, group: 'Shipping' },
  { key: 'AFTERSHIP_API_KEY', required: false, group: 'Shipping' },
  { key: 'APIFY_API_TOKEN', required: false, group: 'Crawler' },
  { key: 'RESEND_API_KEY', required: false, group: 'Email' },
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
    console.error('Missing required environment variables:\n  ' + missing.join('\n  '));
  }
  if (warnings.length > 0) {
    console.warn('Optional environment variables not set:\n  ' + warnings.join('\n  '));
  }

  validated = true;
  return { valid: missing.length === 0, missing, warnings };
}
