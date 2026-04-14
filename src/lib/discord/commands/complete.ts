import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { missions, missionCompletions, dailyMissionSchedule } from '@/db/schema/missions';
import { creators, TIER_CONFIG, type PinkTier } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { calculateTier } from '@/lib/tier/auto-update';
import { calculateStreak } from '@/lib/streak/streak-engine';
import { trackMissionCompletion } from '@/agent/memory/entity';
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
      eq(missions.missionType, missionType as typeof missions.missionType.enumValues[number]),
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

  // BUG-2 FIX: Apply streak calculation (same logic as API route)
  const streakResult = calculateStreak(
    creator.currentStreak ?? 0,
    creator.longestStreak ?? 0,
    creator.lastMissionDate ?? null,
    today,
  );

  const baseReward = parseFloat(mission.rewardAmount ?? '0');
  const baseScore = mission.scoreAmount ?? 0;
  const rewardAmount = Math.round(baseReward * streakResult.multiplier * 100) / 100;
  const scoreAmount = Math.round(baseScore * streakResult.multiplier);

  // Insert completion (inside transaction to prevent race condition)
  try {
    await db.transaction(async (tx) => {
      // Re-check inside transaction
      const doubleCheck = await tx
        .select({ id: missionCompletions.id })
        .from(missionCompletions)
        .where(and(
          eq(missionCompletions.creatorId, link[0].creatorId),
          eq(missionCompletions.missionId, mission.id),
          gte(missionCompletions.completedAt, new Date(`${today}T00:00:00Z`)),
          lte(missionCompletions.completedAt, new Date(`${today}T23:59:59Z`)),
        ))
        .limit(1);

      if (doubleCheck.length > 0) {
        throw new Error('ALREADY_COMPLETED');
      }

      await tx.insert(missionCompletions).values({
        creatorId: link[0].creatorId,
        missionId: mission.id,
        rewardEarned: rewardAmount.toString(),
        scoreEarned: scoreAmount,
        proofUrl,
        verificationMethod: proofUrl ? 'manual' : 'auto',
      });

      // Update creator with streak fields
      const newMissionCount = (creator.missionCount ?? 0) + 1;
      const newFlatFee = parseFloat(creator.flatFeeEarned ?? '0') + rewardAmount;
      const newPinkScore = parseFloat(creator.pinkScore ?? '0') + scoreAmount;

      const tierResult = calculateTier(creator.tier as PinkTier, {
        missionCount: newMissionCount,
        monthlyGmv: parseFloat(creator.monthlyGmv ?? '0'),
      });

      const currentOnboardingStep = creator.onboardingStep ?? 0;
      const newOnboardingStep = currentOnboardingStep < 3 ? 3 : currentOnboardingStep;

      await tx.update(creators).set({
        missionCount: newMissionCount,
        flatFeeEarned: newFlatFee.toString(),
        pinkScore: newPinkScore.toString(),
        tier: tierResult.tier,
        commissionRate: tierResult.commissionRate.toString(),
        squadBonusRate: tierResult.squadBonusRate.toString(),
        currentStreak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak,
        lastMissionDate: streakResult.lastMissionDate,
        onboardingStep: newOnboardingStep,
        ...(tierResult.changed ? { tierUpdatedAt: new Date() } : {}),
        updatedAt: new Date(),
      }).where(eq(creators.id, link[0].creatorId));
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_COMPLETED') {
      await interaction.editReply('✅ 이 미션은 이미 오늘 완료했습니다!');
      return;
    }
    throw err;
  }

  // Update derived values for embed (re-compute after transaction)
  const newMissionCount = (creator.missionCount ?? 0) + 1;
  const newFlatFee = parseFloat(creator.flatFeeEarned ?? '0') + rewardAmount;
  const newPinkScore = parseFloat(creator.pinkScore ?? '0') + scoreAmount;
  const tierResult = calculateTier(creator.tier as PinkTier, {
    missionCount: newMissionCount,
    monthlyGmv: parseFloat(creator.monthlyGmv ?? '0'),
  });

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

  // Streak info
  if (streakResult.currentStreak > 1) {
    embed.addFields({
      name: '🔥 Streak',
      value: `${streakResult.currentStreak}일 (x${streakResult.multiplier})`,
      inline: true,
    });
  }

  if (tierResult.changed) {
    const newConfig = TIER_CONFIG[tierResult.tier];
    const oldConfig = TIER_CONFIG[creator.tier as PinkTier];
    embed.addFields({
      name: '🎉 티어 승급!',
      value: `${oldConfig.emoji} ${oldConfig.label} → ${newConfig.emoji} ${newConfig.label}`,
    });
  }

  await interaction.editReply({ embeds: [embed] });

  // Track in entity memory (L4) — non-blocking
  trackMissionCompletion({
    creatorId: link[0].creatorId,
    missionType: mission.missionType,
    missionTitle: mission.title,
  }).catch(() => {});
}
