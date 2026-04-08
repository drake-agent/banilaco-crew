import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { eq } from 'drizzle-orm';

export async function handleLinkCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  let handle = interaction.options.getString('tiktok_handle', true).trim();
  // Normalize handle
  if (handle.startsWith('@')) handle = handle.slice(1);

  // Check if already linked
  const existingLink = await db
    .select({ id: discordLinks.id })
    .from(discordLinks)
    .where(eq(discordLinks.discordUserId, interaction.user.id))
    .limit(1);

  if (existingLink.length > 0) {
    await interaction.editReply('⚠️ 이미 계정이 연동되어 있습니다. 관리자에게 문의해주세요.');
    return;
  }

  // Find creator by TikTok handle
  const [creator] = await db
    .select({ id: creators.id, tiktokHandle: creators.tiktokHandle, displayName: creators.displayName })
    .from(creators)
    .where(eq(creators.tiktokHandle, handle))
    .limit(1);

  if (!creator) {
    await interaction.editReply(
      `❌ @${handle} 크리에이터를 찾을 수 없습니다.\n` +
      `먼저 가입 신청을 해주세요: \`/join\` 또는 웹사이트에서 신청`,
    );
    return;
  }

  // Create link
  await db.insert(discordLinks).values({
    creatorId: creator.id,
    discordUserId: interaction.user.id,
    discordUsername: interaction.user.username,
    isVerified: true,
  });

  const embed = new EmbedBuilder()
    .setTitle('🔗 계정 연동 완료!')
    .setColor(0x10B981)
    .setDescription(`Discord ↔ TikTok @${handle} 연동되었습니다.`)
    .addFields(
      { name: '크리에이터', value: creator.displayName ?? `@${handle}`, inline: true },
      { name: 'Discord', value: interaction.user.username, inline: true },
    )
    .setFooter({ text: '/me 로 프로필을 확인해보세요!' });

  await interaction.editReply({ embeds: [embed] });
}
