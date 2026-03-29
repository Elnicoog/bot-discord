const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;

client.once('ready', () => {
  console.log(`Bot ready: ${client.user.tag}`);
});

client.login(TOKEN);
