const { Client, GatewayIntentBits, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const Parser = require('rss-parser');
const { WebcastPushConnection } = require('tiktok-live-connector');

console.log('[Startup] Initializing bot...');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const parser = new Parser();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CHANNEL_ID = '1438720227260108810';
const RSS_URL = 'https://rss.app/feeds/N0r9TCzjcAqdUBny.xml';
const TIKTOK_USER = 'Felinoguias';

let ultimoVideo = null;

const commands = [
  {
    name: 'moneda',
    description: 'Apuesta en un lanzamiento de moneda',
    options: [
      {
        name: 'cantidad',
        description: 'Cantidad a apostar (mínimo 1)',
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 1,
      },
      {
        name: 'opcion',
        description: 'Elige cara o cruz',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Cara', value: 'cara' },
          { name: 'Cruz', value: 'cruz' },
        ],
      },
    ],
  },
];

async function registerCommands(clientId) {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  console.log('[Commands] Registering slash commands globally...');
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('[Commands] Slash commands registered successfully.');
  } catch (error) {
    console.error('[Commands] Failed to register slash commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`[Ready] Logged in as ${client.user.tag} (ID: ${client.user.id})`);

  const resolvedClientId = CLIENT_ID || client.user.id;
  await registerCommands(resolvedClientId);

  let canal;
  try {
    canal = await client.channels.fetch(CHANNEL_ID);
  } catch (error) {
    console.error('[TikTok] Failed to fetch notification channel:', error);
    return;
  }

  console.log(`[TikTok] Connecting to live stream for user: ${TIKTOK_USER}`);
  const tiktokLive = new WebcastPushConnection(TIKTOK_USER);

  tiktokLive.connect().catch((error) => {
    console.error('[TikTok] Connection error:', error);
  });

  tiktokLive.on('streamStart', () => {
    console.log(`[TikTok] ${TIKTOK_USER} went live — sending notification.`);
    canal.send(`@everyone 🔴 ¡${TIKTOK_USER} está en LIVE!`);
  });

  console.log('[RSS] Starting RSS polling (interval: 5 minutes).');
  setInterval(async () => {
    try {
      const feed = await parser.parseURL(RSS_URL);
      const video = feed.items[0];

      if (ultimoVideo === video.link) return;

      ultimoVideo = video.link;
      console.log(`[RSS] New TikTok video detected: ${video.link}`);
      canal.send(`@everyone 📢 Nuevo TikTok:\n${video.link}`);
    } catch (error) {
      console.error('[RSS] Failed to fetch or parse RSS feed:', error);
    }
  }, 300000);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;
  console.log(`[Interaction] Command "/${commandName}" triggered by ${user.tag} (ID: ${user.id})`);

  if (commandName === 'moneda') {
    const cantidad = interaction.options.getInteger('cantidad');
    const opcion = interaction.options.getString('opcion');

    console.log(`[Moneda] User: ${user.tag} | Bet: ${cantidad} | Choice: ${opcion}`);

    const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
    console.log(`[Moneda] Coin flip result: ${resultado}`);

    const gano = resultado === opcion;
    const resultadoEmoji = resultado === 'cara' ? '🟡' : '⚪';

    if (gano) {
      console.log(`[Moneda] ${user.tag} WON — bet ${cantidad} on ${opcion}, result was ${resultado}`);
      await interaction.reply(
        `${resultadoEmoji} ¡Salió **${resultado}**!\n✅ ¡Ganaste! Apostaste **${cantidad}** en **${opcion}** y acertaste.`
      );
    } else {
      console.log(`[Moneda] ${user.tag} LOST — bet ${cantidad} on ${opcion}, result was ${resultado}`);
      await interaction.reply(
        `${resultadoEmoji} ¡Salió **${resultado}**!\n❌ Perdiste. Apostaste **${cantidad}** en **${opcion}** pero no fue así.`
      );
    }
  }
});

client.on('error', (error) => {
  console.error('[Client] Connection error:', error);
});

client.on('warn', (message) => {
  console.warn('[Client] Warning:', message);
});

console.log('[Startup] Logging in to Discord...');
client.login(TOKEN);
