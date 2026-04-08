import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { creators, TIER_CONFIG, type PinkTier } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { missionCompletions } from '@/db/schema/missions';
import { eq, sql } from 'drizzle-orm';

export async function handleMeCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  // Resolve discord → creator
  const link = await db
    .select({ creatorId: discordLinks.creatorId })
    .from(discordLinks)
    .where(eq(discordLinks.discordUserId, interaction.user.id))
    .limit(1);

  if (!link[0]) {
    await interaction.editReply('❌ 계정이 연동되지 않았습니다. `/link @tiktok_handle` 로 연동해주세요.');
    return;
  }

  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, link[0].creatorId))
    .limit(1);

  if (!creator) {
    await interaction.editReply('❌ 크리에이터 프로필을 찾을 수 없습니다.');
    return;
  }

  const tierConfig = TIER_CONFIG[creator.tier as PinkTier];
  const commission = (parseFloat(creator.commissionRate ?? '0') * 100).toFixed(0);
  const squadBonus = (parseFloat(creator.squadBonusRate ?? '0') * 100).toFixed(1);

  // Next tier info
  const tierOrder: PinkTier[] = ['pink_petal', 'pink_rose', 'pink_diamond', 'pink_crown'];
  const currentIdx = tierOrder.indexOf(creator.tier as PinkTier);
  let nextTierInfo = '👑 최고 티어 달성!';

  if (currentIdx < tierOrder.length - 1) {
    const thresholds = {
      pink_rose: { missions: 50, gmv: 500 },
      pink_diamond: { missions: 200, gmv: 2500 },
      pink_crown: { missions: null, gmv: 10000 },
    };
    const nextTier = tierOrder[currentIdx + 1];
    const nextConfig = TIER_CONFIG[nextTier];
    const threshold = thresholds[nextTier as keyof typeof thresholds];

    if (threshold) {
      const missionProgress = threshold.missions
        ? `${creator.missionCount ?? 0}/${threshold.missions} 미션`
        : 'PINK LEAGUE 우승';
      const gmvProgress = `$${parseFloat(creator.monthlyGmv ?? '0').toFixed(0)}/$${threshold.gmv}`;
      nextTierInfo = `→ ${nextConfig.emoji} ${nextConfig.label}: ${missionProgress} or ${gmvProgress} GMV`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`${tierConfig.emoji} @${creator.tiktokHandle}`)
    .setColor(0xEC4899)
    .addFields(
      { name: '🏅 티어', value: tierConfig.label, inline: true },
      { name: '💰 커미션', value: `${commission}%`, inline: true },
      { name: '👥 Squad 보너스', value: `${squadBonus}%`, inline: true },
      { name: '⭐ Pink Score', value: `${creator.pinkScore ?? 0}`, inline: true },
      { name: '🎯 미션 완료', value: `${creator.missionCount ?? 0}개`, inline: true },
      { name: '💵 Flat Fee 누적', value: `$${parseFloat(creator.flatFeeEarned ?? '0').toFixed(2)}`, inline: true },
      { name: '📈 월간 GMV', value: `$${parseFloat(creator.monthlyGmv ?? '0').toFixed(2)}`, inline: true },
      { name: '👁 평균 조회수', value: `${creator.avgViews ?? 0}`, inline: true },
      { name: '📊 참여율', value: `${(parseFloat(creator.engagementRate ?? '0') * 100).toFixed(1)}%`, inline: true },
      { name: '🚀 다음 티어', value: nextTierInfo, inline: false },
    )
    .setFooter({ text: 'BANILACO SQUAD' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
