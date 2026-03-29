'use strict';

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// ── Environment ──────────────────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error('Error: la variable de entorno DISCORD_TOKEN no está definida.');
  process.exit(1);
}

// ── Slash command definition ─────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('apostar')
    .setDescription('Apuesta dinero en un lanzamiento de moneda (cara o sello)')
    .addNumberOption((option) =>
      option
        .setName('cantidad')
        .setDescription('Cantidad a apostar (debe ser un número positivo)')
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

// ── Discord client ───────────────────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ── Register slash commands globally once the client is ready ────────────────
client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Registrando comandos slash globalmente…');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Comandos slash registrados correctamente.');
  } catch (error) {
    console.error('Error al registrar los comandos slash:', error);
  }
});

// ── Handle interactions ──────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'apostar') {
    const cantidad = interaction.options.getNumber('cantidad');
    const opcion   = interaction.options.getString('opcion');

    // Validate bet amount (extra safety on top of setMinValue)
    if (cantidad <= 0) {
      await interaction.reply({
        content: '❌ La cantidad a apostar debe ser un número positivo.',
        ephemeral: true,
      });
      return;
    }

    // Coin flip
    const resultado = Math.random() < 0.5 ? 'cara' : 'sello';
    const gano      = resultado === opcion;

    const moneda   = resultado === 'cara' ? '🪙 Cara' : '🎰 Sello';
    const eleccion = opcion    === 'cara' ? '🪙 Cara' : '🎰 Sello';

    const mensaje = gano
      ? `🎉 **¡Ganaste!** Apostaste **${cantidad}** monedas a **${eleccion}** y salió **${moneda}**. ¡Felicidades!`
      : `😢 **¡Perdiste!** Apostaste **${cantidad}** monedas a **${eleccion}** pero salió **${moneda}**. ¡Mejor suerte la próxima vez!`;

    await interaction.reply({ content: mensaje });
  }
});

// ── Login ────────────────────────────────────────────────────────────────────
client.login(TOKEN);
