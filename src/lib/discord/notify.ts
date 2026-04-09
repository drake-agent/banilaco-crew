/**
 * Discord notification utilities
 *
 * Send embeds to specific channels when events happen
 * (mission complete, tier upgrade, league ranking, squad activity).
 */

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { TIER_CONFIG, type PinkTier } from '@/db/schema/creators';

// Channel IDs are stored in env or DB config
const CHANNELS = {
  announcements: process.env.DISCORD_CH_ANNOUNCEMENTS,
  dailyMission: process.env.DISCORD_CH_DAILY_MISSION,
  missionFeed: process.env.DISCORD_CH_MISSION_FEED,
  pinkLeague: process.env.DISCORD_CH_PINK_LEAGUE,
  squadActivity: process.env.DISCORD_CH_SQUAD_ACTIVITY,
} as const;

async function sendToChannel(
  client: Client,
  channelKey: keyof typeof CHANNELS,
  embed: EmbedBuilder,
): Promise<void> {
  const channelId = CHANNELS[channelKey];
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      await (channel as TextChannel).send({ embeds: [embed] });
    }
  } catch (error) {
    console.error(`[Notify] Failed to send to ${channelKey}:`, error);
  }
}

// ---------------------------------------------------------------------------
// Event notifications
// ---------------------------------------------------------------------------

export async function notifyMissionComplete(
  client: Client,
  params: {
    discordUserId: string;
    missionTitle: string;
    missionType: string;
    rewardAmount: number;
    scoreAmount: number;
  },
): Promise<void> {
  const emoji = { learning: '📚', creation: '🎬', viral: '🚀' }[params.missionType] ?? '📋';

  const embed = new EmbedBuilder()
    .setColor(0x10B981)
    .setDescription(
      `${emoji} <@${params.discordUserId}> **${params.missionTitle}** 미션 완료!\n` +
      `💰 +$${params.rewardAmount} | ⭐ +${params.scoreAmount} pts`,
    )
    .setTimestamp();

  await sendToChannel(client, 'missionFeed', embed);
}

export async function notifyTierUpgrade(
  client: Client,
  params: {
    discordUserId: string;
    oldTier: PinkTier;
    newTier: PinkTier;
  },
): Promise<void> {
  const oldConfig = TIER_CONFIG[params.oldTier];
  const newConfig = TIER_CONFIG[params.newTier];

  const embed = new EmbedBuilder()
    .setTitle('🎉 티어 승급!')
    .setColor(0xF59E0B)
    .setDescription(
      `<@${params.discordUserId}>\n` +
      `${oldConfig.emoji} ${oldConfig.label} → ${newConfig.emoji} **${newConfig.label}**\n\n` +
      `커미션: ${(newConfig.commission * 100).toFixed(0)}% | Squad 보너스: ${(newConfig.squadBonus * 100).toFixed(1)}%`,
    )
    .setTimestamp();

  await sendToChannel(client, 'announcements', embed);
}

export async function notifySquadJoin(
  client: Client,
  params: {
    leaderDiscordId: string;
    newMemberHandle: string;
  },
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x8B5CF6)
    .setDescription(
      `👥 <@${params.leaderDiscordId}>의 Squad에 **@${params.newMemberHandle}** 합류!`,
    )
    .setTimestamp();

  await sendToChannel(client, 'squadActivity', embed);
}

export async function notifyStreakMilestone(
  client: Client,
  params: {
    discordUserId: string;
    streakDays: number;
    milestoneName: string;
    milestoneEmoji: string;
    multiplier: number;
  },
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle(`${params.milestoneEmoji} Streak Milestone!`)
    .setColor(0xF59E0B)
    .setDescription(
      `<@${params.discordUserId}> hit a **${params.streakDays}-day streak!**\n\n` +
      `${params.milestoneEmoji} **${params.milestoneName}** unlocked!\n` +
      `All mission rewards now have a **${params.multiplier}x multiplier!**`,
    )
    .setTimestamp();

  await sendToChannel(client, 'missionFeed', embed);
}

export async function notifyLeagueRankChange(
  client: Client,
  params: {
    discordUserId: string;
    newRank: number;
    previousRank: number;
    seasonTitle: string;
  },
): Promise<void> {
  const isUp = params.newRank < params.previousRank;
  const diff = Math.abs(params.newRank - params.previousRank);

  const embed = new EmbedBuilder()
    .setColor(isUp ? 0x10B981 : 0xEF4444)
    .setDescription(
      `${isUp ? '📈' : '📉'} <@${params.discordUserId}> ` +
      `**#${params.previousRank}** → **#${params.newRank}** ` +
      `(${isUp ? '↑' : '↓'}${diff}) in ${params.seasonTitle}`,
    )
    .setTimestamp();

  await sendToChannel(client, 'pinkLeague', embed);
}

export async function notifyDailyMissions(
  client: Client,
  missionsList: Array<{ title: string; missionType: string; rewardAmount: string; scoreAmount: number }>,
): Promise<void> {
  const emoji = { learning: '📚', creation: '🎬', viral: '🚀' } as Record<string, string>;

  const embed = new EmbedBuilder()
    .setTitle('🌸 오늘의 핑크 루틴')
    .setColor(0xEC4899)
    .setDescription('새로운 미션이 준비되었습니다! `/mission` 으로 확인하세요.')
    .setTimestamp();

  for (const m of missionsList) {
    embed.addFields({
      name: `${emoji[m.missionType] ?? '📋'} ${m.title}`,
      value: `💰 $${m.rewardAmount} | ⭐ +${m.scoreAmount} pts`,
      inline: false,
    });
  }

  await sendToChannel(client, 'dailyMission', embed);
}
