import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { eq } from 'drizzle-orm';
import { initCreatorEntity } from '@/agent/memory/entity';

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

  // Find creator by TikTok handle (need full row for entity init)
  const [creator] = await db
    .select()
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

  // SEC-2: Reverse-link check — prevent multiple discord accounts linking to same creator
  const existingCreatorLink = await db
    .select({ id: discordLinks.id })
    .from(discordLinks)
    .where(eq(discordLinks.creatorId, creator.id))
    .limit(1);

  if (existingCreatorLink.length > 0) {
    await interaction.editReply('⚠️ 이 크리에이터 계정은 이미 다른 Discord 계정에 연동되어 있습니다.');
    return;
  }

  // Create discord link
  await db.insert(discordLinks).values({
    creatorId: creator.id,
    discordUserId: interaction.user.id,
    discordUsername: interaction.user.username,
    isVerified: true,
  });

  // Update onboarding step (step 1 = Discord connected)
  if ((creator.onboardingStep ?? 0) < 1) {
    await db
      .update(creators)
      .set({ onboardingStep: 1 })
      .where(eq(creators.id, creator.id));
  }

  // Initialize L4 entity memory — creator node + relationships
  try {
    await initCreatorEntity({
      creatorId: creator.id,
      tiktokHandle: creator.tiktokHandle,
      displayName: creator.displayName,
      tier: creator.tier,
      squadLeaderId: creator.squadLeaderId,
      squadCode: creator.squadCode,
      tags: (creator.tags as string[]) ?? [],
    });
  } catch (err) {
    // Non-blocking — entity init failure shouldn't block linking
    console.error('[Link] Entity init failed:', err);
  }

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
