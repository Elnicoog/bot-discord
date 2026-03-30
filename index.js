const { Client, GatewayIntentBits, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const Parser = require('rss-parser');
const { WebcastPushConnection } = require('tiktok-live-connector');

console.log('[Bot] Starting bot...');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const parser = new Parser();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CHANNEL_ID = '1438720227260108810';
const RSS_URL = 'https://rss.app/feeds/N0r9TCzjcAqdUBny.xml';
const TIKTOK_USER = 'Felinoguias';

let ultimoVideo = null;

const commands = [
  {
    name: 'moneda',
    description: 'Lanza una moneda y apuesta',
    options: [
      {
        name: 'cantidad',
        description: 'Cantidad a apostar',
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: 'opcion',
        description: 'Cara o Cruz',
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

async function registerCommands() {
  console.log('[Commands] Attempting to register slash commands...');
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(`[Commands] Successfully registered ${commands.length} slash command(s).`);
  } catch (error) {
    console.error('[Commands] Failed to register slash commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag} (ID: ${client.user.id})`);

  await registerCommands();
  console.log('[Bot] Slash commands registration complete.');

  const canal = await client.channels.fetch(CHANNEL_ID);

  console.log(`[TikTok] Connecting to TikTok live for user: ${TIKTOK_USER}`);
  const tiktokLive = new WebcastPushConnection(TIKTOK_USER);

  tiktokLive.connect().catch((err) => {
    console.error('[TikTok] Failed to connect to TikTok live:', err);
  });

  tiktokLive.on('streamStart', () => {
    console.log(`[TikTok] ${TIKTOK_USER} went live — sending notification.`);
    canal.send(`@everyone 🔴 ¡${TIKTOK_USER} está en LIVE!`);
  });

  console.log('[RSS] Starting RSS feed polling interval (every 5 minutes).');
  setInterval(async () => {
    try {
      const feed = await parser.parseURL(RSS_URL);
      const video = feed.items[0];

      if (ultimoVideo === video.link) return;

      ultimoVideo = video.link;
      console.log(`[RSS] New TikTok video detected: ${video.link}`);
      canal.send(`@everyone 📢 Nuevo TikTok:\n${video.link}`);
    } catch (err) {
      console.error('[RSS] Error fetching RSS feed:', err);
    }
  }, 300000);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`[Interaction] Command received: /${interaction.commandName}`);
  console.log(`[Interaction] Executed by: ${interaction.user.tag} (ID: ${interaction.user.id})`);

  if (interaction.commandName === 'moneda') {
    const cantidad = interaction.options.getInteger('cantidad');
    const opcion = interaction.options.getString('opcion');

    console.log(`[Interaction] Parameters — cantidad: ${cantidad}, opcion: ${opcion}`);

    const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
    console.log(`[Interaction] Coin flip result: ${resultado}`);

    const gano = resultado === opcion;
    console.log(`[Interaction] User ${interaction.user.tag} ${gano ? 'WON' : 'LOST'} the coin flip.`);

    await interaction.reply(
      gano
        ? `🎉 ¡Salió **${resultado}**! Ganaste **${cantidad}** monedas.`
        : `😢 Salió **${resultado}**. Perdiste **${cantidad}** monedas.`
    );
  }
});

client.on('error', (error) => {
  console.error('[Client] Connection error:', error);
});

client.on('warn', (warning) => {
  console.warn('[Client] Warning:', warning);
});

client.login(TOKEN);
