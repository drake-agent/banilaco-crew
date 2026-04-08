import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { creators, TIER_CONFIG, type PinkTier } from '@/db/schema/creators';
import { desc, sql } from 'drizzle-orm';

export async function handleRankingCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Get top 10 creators by pink_score
  const topCreators = await db
    .select({
      tiktokHandle: creators.tiktokHandle,
      displayName: creators.displayName,
      tier: creators.tier,
      pinkScore: creators.pinkScore,
      monthlyGmv: creators.monthlyGmv,
      missionCount: creators.missionCount,
    })
    .from(creators)
    .where(sql`${creators.status} = 'active'`)
    .orderBy(desc(sql`${creators.pinkScore}::numeric`))
    .limit(10);

  if (topCreators.length === 0) {
    await interaction.editReply('📭 아직 랭킹 데이터가 없습니다.');
    return;
  }

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  const lines = topCreators.map((c, i) => {
    const tierConfig = TIER_CONFIG[c.tier as PinkTier];
    const score = parseFloat(c.pinkScore ?? '0').toFixed(0);
    const gmv = parseFloat(c.monthlyGmv ?? '0').toFixed(0);
    return `${medals[i]} **@${c.tiktokHandle}** ${tierConfig.emoji}\n` +
      `　⭐ ${score} pts | 💰 $${gmv} GMV | 🎯 ${c.missionCount ?? 0} missions`;
  });

  const embed = new EmbedBuilder()
    .setTitle('🏆 PINK LEAGUE — TOP 10')
    .setColor(0xEC4899)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'BANILACO SQUAD | Pink Score = GMV + Viral Index' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
