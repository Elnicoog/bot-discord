const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const Parser = require('rss-parser');
const { WebcastPushConnection } = require('tiktok-live-connector');


const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const parser = new Parser();


const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = '1441638286895480923';
const CHANNEL_ID = '1438720227260108810';
const RSS_URL = 'https://rss.app/feeds/N0r9TCzjcAqdUBny.xml';
const TIKTOK_USER = 'Felinoguias';

let ultimoVideo = null;


const commands = [
  {
    name: 'Hola',
    description: 'Responde Baboso'
  }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registrando comandos...');

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log('Comandos registrados');
  } catch (error) {
    console.error(error);
  }
})();


client.once('clientReady', async () => {
  console.log(`Bot listo como ${client.user.tag}`);

  const canal = await client.channels.fetch(CHANNEL_ID);

  const tiktokLive = new WebcastPushConnection(TIKTOK_USER);

  tiktokLive.connect().catch(() => {});

  tiktokLive.on('streamStart', () => {
    canal.send(`@everyone 🔴 ¡${TIKTOK_USER} está en LIVE!`);
  });

  setInterval(async () => {
    const feed = await parser.parseURL(RSS_URL);
    const video = feed.items[0];

    if (!video || ultimoVideo === video.link) return;

    ultimoVideo = video.link;

    canal.send(`@everyone 📢 Nuevo TikTok:\n${video.link}`);
  }, 300000);
});


client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});


client.login(TOKEN);
