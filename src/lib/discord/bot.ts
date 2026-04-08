/**
 * BANILACO SQUAD Discord Bot
 *
 * discord.js v14 bot with:
 * - Slash commands (missions, ranking, squad, etc.)
 * - Natural language conversation via Agent Gateway
 * - Auto-notifications to channels
 */

import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  type Interaction,
  type Message,
} from 'discord.js';
import { processMessage } from '@/agent/gateway';
import { handleMissionCommand } from './commands/mission';
import { handleMeCommand } from './commands/me';
import { handleRankingCommand } from './commands/ranking';
import { handleCompleteCommand } from './commands/complete';
import { handleLinkCommand } from './commands/link';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;

// ---------------------------------------------------------------------------
// Slash command definitions
// ---------------------------------------------------------------------------
const commands = [
  new SlashCommandBuilder()
    .setName('mission')
    .setDescription('오늘의 미션 목록을 확인합니다'),

  new SlashCommandBuilder()
    .setName('complete')
    .setDescription('미션을 완료합니다')
    .addStringOption((opt) =>
      opt.setName('type').setDescription('미션 타입').setRequired(true)
        .addChoices(
          { name: 'Learning', value: 'learning' },
          { name: 'Creation', value: 'creation' },
          { name: 'Viral', value: 'viral' },
        ),
    )
    .addStringOption((opt) =>
      opt.setName('proof').setDescription('증거 URL (콘텐츠 링크)').setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName('me')
    .setDescription('내 프로필, 티어, Pink Score를 확인합니다'),

  new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('PINK LEAGUE TOP 10 랭킹을 확인합니다'),

  new SlashCommandBuilder()
    .setName('squad')
    .setDescription('내 Squad 정보를 확인합니다'),

  new SlashCommandBuilder()
    .setName('link')
    .setDescription('TikTok 계정을 연동합니다')
    .addStringOption((opt) =>
      opt.setName('tiktok_handle').setDescription('@handle (예: @miabeauty)').setRequired(true),
    ),
];

// ---------------------------------------------------------------------------
// Register slash commands
// ---------------------------------------------------------------------------
async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  try {
    console.log('[Bot] Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map((c) => c.toJSON()) },
    );
    console.log('[Bot] Slash commands registered.');
  } catch (error) {
    console.error('[Bot] Failed to register commands:', error);
  }
}

// ---------------------------------------------------------------------------
// Bot client
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------
client.once('ready', () => {
  console.log(`[Bot] 🌸 BANILACO SQUAD Bot ready as ${client.user?.tag}`);
  console.log(`[Bot] Serving guild: ${GUILD_ID}`);
});

// Slash command handler
client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'mission':
        await handleMissionCommand(interaction);
        break;
      case 'complete':
        await handleCompleteCommand(interaction);
        break;
      case 'me':
        await handleMeCommand(interaction);
        break;
      case 'ranking':
        await handleRankingCommand(interaction);
        break;
      case 'link':
        await handleLinkCommand(interaction);
        break;
      default:
        await interaction.reply({ content: '알 수 없는 명령입니다.', ephemeral: true });
    }
  } catch (error) {
    console.error(`[Bot] Command error (${interaction.commandName}):`, error);
    const reply = { content: '❌ 명령 처리 중 에러가 발생했습니다.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Natural language message handler (mentions or DMs)
client.on('messageCreate', async (message: Message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Respond to mentions or DMs
  const isMentioned = message.mentions.has(client.user!);
  const isDM = !message.guild;

  if (isMentioned || isDM) {
    // Strip bot mention from content
    const cleanContent = message.content
      .replace(new RegExp(`<@!?${client.user!.id}>`, 'g'), '')
      .trim();

    if (!cleanContent) return;

    // Process through agent gateway
    const fakeMessage = Object.assign(message, {
      content: cleanContent,
    });
    await processMessage(fakeMessage);
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  await registerCommands();
  await client.login(BOT_TOKEN);
}

main().catch(console.error);

export { client };
