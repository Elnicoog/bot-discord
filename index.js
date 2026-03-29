const { Client, GatewayIntentBits } = require('discord.js');
const Parser = require('rss-parser');
const { WebcastPushConnection } = require('tiktok-live-connector');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const parser = new Parser();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = '1438720227260108810';
const RSS_URL = 'https://rss.app/feeds/N0r9TCzjcAqdUBny.xml';
const TIKTOK_USER = 'Felinoguias';

let ultimoVideo = null;

client.once('ready', async () => {
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

client.login(TOKEN);
