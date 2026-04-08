import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { missions, missionCompletions, dailyMissionSchedule } from '@/db/schema/missions';
import { creators, TIER_CONFIG, type PinkTier } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { calculateTier } from '@/lib/tier/auto-update';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function handleCompleteCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const missionType = interaction.options.getString('type', true);
  const proofUrl = interaction.options.getString('proof');

  // Resolve creator
  const link = await db
    .select({ creatorId: discordLinks.creatorId })
    .from(discordLinks)
    .where(eq(discordLinks.discordUserId, interaction.user.id))
    .limit(1);

  if (!link[0]) {
    await interaction.editReply('❌ 계정을 먼저 연동해주세요: `/link @tiktok_handle`');
    return;
  }

  const [creator] = await db.select().from(creators).where(eq(creators.id, link[0].creatorId)).limit(1);
  if (!creator) {
    await interaction.editReply('❌ 크리에이터 프로필을 찾을 수 없습니다.');
    return;
  }

  // Find today's mission of this type
  const today = new Date().toISOString().split('T')[0];
  const [scheduled] = await db
    .select({ mission: missions })
    .from(dailyMissionSchedule)
    .innerJoin(missions, eq(dailyMissionSchedule.missionId, missions.id))
    .where(and(
      eq(dailyMissionSchedule.activeDate, today),
      eq(missions.missionType, missionType),
      eq(missions.isActive, true),
    ))
    .limit(1);

  if (!scheduled) {
    await interaction.editReply(`❌ 오늘 "${missionType}" 타입 미션이 없습니다.`);
    return;
  }

  const mission = scheduled.mission;

  // Check already completed
  const existing = await db
    .select({ id: missionCompletions.id })
    .from(missionCompletions)
    .where(and(
      eq(missionCompletions.creatorId, link[0].creatorId),
      eq(missionCompletions.missionId, mission.id),
      gte(missionCompletions.completedAt, new Date(`${today}T00:00:00Z`)),
      lte(missionCompletions.completedAt, new Date(`${today}T23:59:59Z`)),
    ))
    .limit(1);

  if (existing.length > 0) {
    await interaction.editReply('✅ 이 미션은 이미 오늘 완료했습니다!');
    return;
  }

  const rewardAmount = parseFloat(mission.rewardAmount ?? '0');
  const scoreAmount = mission.scoreAmount ?? 0;

  // Insert completion
  await db.insert(missionCompletions).values({
    creatorId: link[0].creatorId,
    missionId: mission.id,
    rewardEarned: rewardAmount.toString(),
    scoreEarned: scoreAmount,
    proofUrl,
    verificationMethod: proofUrl ? 'manual' : 'auto',
  });

  // Update creator
  const newMissionCount = (creator.missionCount ?? 0) + 1;
  const newFlatFee = parseFloat(creator.flatFeeEarned ?? '0') + rewardAmount;
  const newPinkScore = parseFloat(creator.pinkScore ?? '0') + scoreAmount;

  const tierResult = calculateTier(creator.tier as PinkTier, {
    missionCount: newMissionCount,
    monthlyGmv: parseFloat(creator.monthlyGmv ?? '0'),
    aiProfileCompleted: creator.aiProfileCompleted ?? false,
  });

  await db.update(creators).set({
    missionCount: newMissionCount,
    flatFeeEarned: newFlatFee.toString(),
    pinkScore: newPinkScore.toString(),
    tier: tierResult.tier,
    commissionRate: tierResult.commissionRate.toString(),
    squadBonusRate: tierResult.squadBonusRate.toString(),
    ...(tierResult.changed ? { tierUpdatedAt: new Date() } : {}),
    updatedAt: new Date(),
  }).where(eq(creators.id, link[0].creatorId));

  // Build response
  const emoji = { learning: '📚', creation: '🎬', viral: '🚀' }[missionType] ?? '📋';

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} 미션 완료!`)
    .setColor(0x10B981)
    .addFields(
      { name: '미션', value: mission.title, inline: true },
      { name: '💰 Flat Fee', value: `+$${rewardAmount}`, inline: true },
      { name: '⭐ Score', value: `+${scoreAmount}`, inline: true },
      { name: '🎯 총 미션', value: `${newMissionCount}개`, inline: true },
      { name: '⭐ Pink Score', value: `${newPinkScore.toFixed(0)}`, inline: true },
    );

  if (tierResult.changed) {
    const newConfig = TIER_CONFIG[tierResult.tier];
    const oldConfig = TIER_CONFIG[creator.tier as PinkTier];
    embed.addFields({
      name: '🎉 티어 승급!',
      value: `${oldConfig.emoji} ${oldConfig.label} → ${newConfig.emoji} ${newConfig.label}`,
    });
  }

  await interaction.editReply({ embeds: [embed] });

  // TODO: Notify #mission-feed channel
}
