const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  InteractionType,
} = require('discord.js');
const Parser = require('rss-parser');
const { WebcastPushConnection } = require('tiktok-live-connector');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const parser = new Parser();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = '1438720227260108810';
const RSS_URL = 'https://rss.app/feeds/N0r9TCzjcAqdUBny.xml';
const TIKTOK_USER = 'Felinoguias';

let ultimoVideo = null;

// ---------------------------------------------------------------------------
// Slash command definitions
// ---------------------------------------------------------------------------

const commands = [
  new SlashCommandBuilder()
    .setName('apostar')
    .setDescription('Apuesta dinero en un lanzamiento de moneda 🪙')
    .addNumberOption((option) =>
      option
        .setName('cantidad')
        .setDescription('Cantidad a apostar (mínimo 1)')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((option) =>
      option
        .setName('opcion')
        .setDescription('Elige cara o sello')
        .setRequired(true)
        .addChoices(
          { name: 'Cara', value: 'cara' },
          { name: 'Sello', value: 'sello' }
        )
    )
    .toJSON(),
];

// ---------------------------------------------------------------------------
// Register slash commands globally on startup
// ---------------------------------------------------------------------------

async function registerCommands(clientId) {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registrando slash commands globalmente…');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Slash commands registrados correctamente.');
  } catch (error) {
    console.error('Error al registrar slash commands:', error);
  }
}

// ---------------------------------------------------------------------------
// Bot events
// ---------------------------------------------------------------------------

client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  await registerCommands(client.user.id);

  const canal = await client.channels.fetch(CHANNEL_ID);

  const tiktokLive = new WebcastPushConnection(TIKTOK_USER);

  tiktokLive.connect().catch(() => {});

  tiktokLive.on('streamStart', () => {
    canal.send(`@everyone 🔴 ¡${TIKTOK_USER} está en LIVE!`);
  });

  setInterval(async () => {
    const feed = await parser.parseURL(RSS_URL);
    const video = feed.items[0];

    if (ultimoVideo === video.link) return;

    ultimoVideo = video.link;

    canal.send(`@everyone 📢 Nuevo TikTok:\n${video.link}`);
  }, 300000);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;

  if (interaction.commandName === 'apostar') {
    const cantidad = interaction.options.getNumber('cantidad');
    const opcion = interaction.options.getString('opcion');

    // Validate bet amount (guard against edge cases beyond setMinValue)
    if (cantidad < 1) {
      return interaction.reply({
        content: '❌ La cantidad a apostar debe ser al menos **1**.',
        ephemeral: true,
      });
    }

    // Flip the coin
    const resultado = Math.random() < 0.5 ? 'cara' : 'sello';
    const gano = opcion === resultado;

    const emoji = resultado === 'cara' ? '🟡' : '⚪';
    const veredicto = gano
      ? `🎉 ¡Ganaste **${cantidad}** monedas!`
      : `💸 Perdiste **${cantidad}** monedas.`;

    return interaction.reply(
      `${emoji} La moneda cayó en **${resultado}**.\n` +
        `Elegiste **${opcion}** — ${veredicto}`
    );
  }
});

client.login(TOKEN);
