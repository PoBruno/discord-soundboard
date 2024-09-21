// discord-bot/bot.js
const { Client, GatewayIntentBits } = require('discord.js');
const { createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const dotenv = require('dotenv');

dotenv.config();
DISCORD_TOKEN = dotenv.config().parsed.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Essa linha pode causar erro em algumas versões. Tente remover se continuar o problema
    ]
});

const token = process.env.DISCORD_TOKEN;

client.once('ready', () => {
    console.log(`Bot ${client.user.tag} está online!`);
});

client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!play')) {
        const sound = message.content.split(' ')[1];
        const channel = message.member.voice.channel;

        if (channel) {
            const connection = await channel.join();
            const player = createAudioPlayer();
            const resource = createAudioResource(`../backend/sounds/${sound}`);

            player.play(resource);
            connection.subscribe(player);

            player.on('finish', () => {
                channel.leave();
            });
        } else {
            message.reply('Você precisa estar em um canal de voz para tocar um som!');
        }
    }
});

// Iniciar o bot
client.login(DISCORD_TOKEN);

