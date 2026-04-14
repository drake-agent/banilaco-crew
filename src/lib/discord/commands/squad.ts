import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { creators, TIER_CONFIG, type PinkTier } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { eq } from 'drizzle-orm';

export async function handleSquadCommand(interaction: ChatInputCommandInteraction) {
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

  // Find squad members (creators whose squadLeaderId = me)
  const members = await db
    .select({
      tiktokHandle: creators.tiktokHandle,
      displayName: creators.displayName,
      tier: creators.tier,
      pinkScore: creators.pinkScore,
      missionCount: creators.missionCount,
    })
    .from(creators)
    .where(eq(creators.squadLeaderId, creator.id))
    .limit(20);

  // Find my squad leader
  let leaderInfo: string | null = null;
  if (creator.squadLeaderId) {
    const [leader] = await db
      .select({ tiktokHandle: creators.tiktokHandle, displayName: creators.displayName })
      .from(creators)
      .where(eq(creators.id, creator.squadLeaderId))
      .limit(1);
    if (leader) {
      leaderInfo = leader.displayName ?? `@${leader.tiktokHandle}`;
    }
  }

  const squadBonus = (parseFloat(creator.squadBonusRate ?? '0') * 100).toFixed(1);

  const embed = new EmbedBuilder()
    .setTitle(`👥 ${creator.displayName ?? `@${creator.tiktokHandle}`}의 Squad`)
    .setColor(0xEC4899);

  // Squad code
  if (creator.squadCode) {
    embed.addFields({
      name: '🔗 초대 코드',
      value: `\`${creator.squadCode}\` (공유해서 멤버를 모집하세요!)`,
      inline: false,
    });
  }

  // Squad leader info
  if (leaderInfo) {
    embed.addFields({
      name: '👑 나의 리더',
      value: leaderInfo,
      inline: true,
    });
  }

  // Revenue share
  embed.addFields({
    name: '💰 Squad 보너스',
    value: `${squadBonus}%`,
    inline: true,
  });

  // Members list
  if (members.length > 0) {
    const memberList = members.map((m) => {
      const tierConfig = TIER_CONFIG[m.tier as PinkTier];
      return `${tierConfig.emoji} @${m.tiktokHandle} — ${m.missionCount ?? 0} 미션`;
    }).join('\n');

    embed.addFields({
      name: `📋 멤버 (${members.length}명)`,
      value: memberList.slice(0, 1024),
      inline: false,
    });
  } else {
    embed.addFields({
      name: '📋 멤버',
      value: '아직 멤버가 없습니다. 초대 코드를 공유해보세요!',
      inline: false,
    });
  }

  embed.setFooter({ text: 'BANILACO SQUAD' }).setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
