import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { missions, missionCompletions, dailyMissionSchedule } from '@/db/schema/missions';
import { discordLinks } from '@/db/schema/discord';
import { eq, and, gte, lte } from 'drizzle-orm';

const MISSION_EMOJI = { learning: '📚', creation: '🎬', viral: '🚀' } as const;

export async function handleMissionCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const today = new Date().toISOString().split('T')[0];

  // Get today's missions
  const todayMissions = await db
    .select({ mission: missions, slotOrder: dailyMissionSchedule.slotOrder })
    .from(dailyMissionSchedule)
    .innerJoin(missions, eq(dailyMissionSchedule.missionId, missions.id))
    .where(and(eq(dailyMissionSchedule.activeDate, today), eq(missions.isActive, true)))
    .orderBy(dailyMissionSchedule.slotOrder);

  if (todayMissions.length === 0) {
    await interaction.editReply('📭 오늘 예정된 미션이 없습니다.');
    return;
  }

  // Check user's completions
  const link = await db
    .select({ creatorId: discordLinks.creatorId })
    .from(discordLinks)
    .where(eq(discordLinks.discordUserId, interaction.user.id))
    .limit(1);

  let completedIds = new Set<string>();
  if (link[0]) {
    const completions = await db
      .select({ missionId: missionCompletions.missionId })
      .from(missionCompletions)
      .where(and(
        eq(missionCompletions.creatorId, link[0].creatorId),
        gte(missionCompletions.completedAt, new Date(`${today}T00:00:00Z`)),
        lte(missionCompletions.completedAt, new Date(`${today}T23:59:59Z`)),
      ));
    completedIds = new Set(completions.map((c) => c.missionId));
  }

  const embed = new EmbedBuilder()
    .setTitle(`🌸 오늘의 핑크 루틴 — ${today}`)
    .setColor(0xEC4899)
    .setDescription('매일 미션을 완료하고 Pink Score를 올려보세요!')
    .setFooter({ text: 'BANILACO SQUAD | /complete 으로 미션 완료' });

  for (const { mission: m } of todayMissions) {
    const emoji = MISSION_EMOJI[m.missionType as keyof typeof MISSION_EMOJI] ?? '📋';
    const status = completedIds.has(m.id) ? '✅ 완료' : '⬜ 미완료';
    const reward = parseFloat(m.rewardAmount ?? '0');
    const score = m.scoreAmount ?? 0;

    embed.addFields({
      name: `${emoji} ${m.title} ${status}`,
      value: [
        m.description ?? '',
        `💰 Flat Fee: $${reward} | ⭐ Score: +${score}`,
      ].join('\n'),
      inline: false,
    });
  }

  const completed = completedIds.size;
  const total = todayMissions.length;
  embed.addFields({
    name: '📊 진행률',
    value: `${'🟩'.repeat(completed)}${'⬜'.repeat(total - completed)} ${completed}/${total}`,
  });

  await interaction.editReply({ embeds: [embed] });
}
