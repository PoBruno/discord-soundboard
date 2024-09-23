const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const PASSWORD = process.env.PASSWORD || 'monga';

app.use(express.json());
app.use(fileUpload());
app.use(cookieParser());

const soundsDir = path.join(__dirname, 'sounds');

// Middleware de autenticação  
app.use((req, res, next) => {
    const publicPaths = ['/login.html', '/api/login', '/styles.css', '/script.js'];
    if (publicPaths.includes(req.path)) {
        return next();
    }
    const token = req.cookies['auth-token'];
    if (token && token === PASSWORD) {
        return next();
    } else {
        return res.redirect('/login.html');
    }
});

// Servir a página de login  
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// Rota de login  
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        res.cookie('auth-token', password, { httpOnly: true });
        return res.json({ success: true });
    } else {
        return res.json({ success: false });
    }
});

// Servir a aplicação principal  
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Servir a lista de sons  
app.get('/api/sounds', (req, res) => {
    fs.readdir(soundsDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list sounds' });
        const sounds = files.filter(file => file.endsWith('.mp3')).map((file, index) => ({ id: index, name: path.basename(file, '.mp3') }));
        return res.json(sounds);
    });
});

// Upload de som  
app.post('/api/upload-sound', (req, res) => {
    if (!req.files || !req.files.sound) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const sound = req.files.sound;
    // Verificar se o arquivo é um .mp3  
    if (sound.mimetype !== 'audio/mpeg') {
        return res.status(400).json({ error: 'Only .mp3 files are allowed' });
    }

    const uploadPath = path.join(soundsDir, sound.name);
    // Certifique-se de que a pasta 'sounds' existe, senão crie-a  
    if (!fs.existsSync(soundsDir)) {
        fs.mkdirSync(soundsDir, { recursive: true });
    }

    // Mover o arquivo para a pasta 'sounds'  
    sound.mv(uploadPath, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to upload sound' });
        return res.json({ success: true });
    });
});

// Rota para obter a lista de canais de voz da guilda  
app.get('/api/voice-channels', async (req, res) => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        if (!guild) {
            console.error(`Guild with ID ${process.env.GUILD_ID} not found`);
            return res.status(404).json({ error: 'Guild not found' });
        }

        let channels = guild.channels.cache.filter(channel => channel.type === 2); // Use 2 for voice channels  

        // Filtrar por categoria se CATEGORY_ID estiver definido  
        if (process.env.CATEGORY_ID) {
            channels = channels.filter(channel => channel.parentId === process.env.CATEGORY_ID);
        }

        const voiceChannels = channels.map(channel => ({ id: channel.id, name: channel.name }));
        return res.json(voiceChannels);
    } catch (error) {
        console.error('Failed to fetch voice channels:', error);
        return res.status(500).json({ error: 'Failed to fetch voice channels' });
    }
});

// Rota para fazer o bot entrar no canal de voz  
app.post('/api/join-voice', async (req, res) => {
    const { channelId } = req.body;
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            console.error('Channel not found');
            return res.status(404).json({ error: 'Channel not found' });
        }

        console.log(`Joining voice channel: ${channel.id}`);
        joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });
        return res.json({ success: true });
    } catch (error) {
        console.error('Failed to join voice channel:', error);
        return res.status(500).json({ error: 'Failed to join voice channel' });
    }
});

// Rota para fazer o bot sair do canal de voz  
app.post('/api/leave-voice', (req, res) => {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        const channel = guild.channels.cache.get(process.env.VOICE_CHANNEL_ID);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        const connection = getVoiceConnection(channel.guild.id);
        if (connection) {
            connection.destroy();
            return res.json({ success: true });
        } else {
            return res.status(404).json({ error: 'Bot is not in a voice channel' });
        }
    } catch (error) {
        console.error('Failed to leave voice channel:', error);
        return res.status(500).json({ error: 'Failed to leave voice channel' });
    }
});

// Rota para tocar um som  
app.post('/api/play-sound', (req, res) => {
    const { soundId } = req.body;
    fs.readdir(soundsDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list sounds' });
        const sounds = files.filter(file => file.endsWith('.mp3'));
        if (soundId < 0 || soundId >= sounds.length) {
            return res.status(400).json({ error: 'Invalid sound ID' });
        }
        const soundPath = path.join(soundsDir, sounds[soundId]);
        console.log(`Playing sound: ${soundPath}`);
        playSoundInDiscord(soundPath);
        return res.json({ success: true });
    });
});

function playSoundInDiscord(soundPath) {
    const channel = client.channels.cache.get(process.env.VOICE_CHANNEL_ID);
    const connection = getVoiceConnection(channel.guild.id);
    if (!connection) {
        console.error('Bot is not connected to a voice channel');
        return;
    }

    const resource = createAudioResource(soundPath);
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        console.log('Finished playing sound');
    });
}

// Rota para renomear um som  
app.post('/api/rename-sound', (req, res) => {
    const { oldName, newName } = req.body;
    const oldPath = path.join(soundsDir, oldName + '.mp3');
    const newPath = path.join(soundsDir, newName + '.mp3');

    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to rename sound' });
        return res.json({ success: true });
    });
});

// Rota para excluir um som  
app.post('/api/delete-sound', (req, res) => {
    const { name } = req.body;
    const filePath = path.join(soundsDir, name + '.mp3');

    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete sound' });
        return res.json({ success: true });
    });
});


// Rota para verificar se o bot está conectado a um canal de voz  
app.get('/api/voice-status', (req, res) => {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
    }

    const connection = getVoiceConnection(guild.id);
    if (connection) {
        return res.json({ connected: true, channelId: connection.joinConfig.channelId });
    } else {
        return res.json({ connected: false });
    }
});   

// Configuração do cliente Discord  
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once('ready', () => {
    console.log('Discord bot is ready');
});

// Certifique-se de que o cliente esteja pronto antes de começar a ouvir no Express  
client.login(process.env.DISCORD_TOKEN).then(() => {
    client.once('ready', () => {
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    });
}).catch(error => {
    console.error('Failed to login to Discord:', error);
});  


