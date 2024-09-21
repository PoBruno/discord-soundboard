const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser'); // Importando o cookie-parser  
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, generateDependencyReport } = require('@discordjs/voice');
const sodium = require('libsodium-wrappers');
require('dotenv').config();

(async () => {
    await sodium.ready;

    const app = express();
    const port = process.env.PORT || 3000;
    const PASSWORD = process.env.PASSWORD || 'monga';

    app.use(express.json());
    app.use(fileUpload());
    app.use(cookieParser()); // Adicionando o middleware cookie-parser  

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
            const sounds = files.filter(file => file.endsWith('.mp3')).map((file, index) => ({
                id: index,
                name: path.basename(file, '.mp3')
            }));
            return res.json(sounds);
        });
    });

    // Upload de som  
    app.post('/api/upload-sound', (req, res) => {
        if (!req.files || !req.files.sound) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const sound = req.files.sound;
        const uploadPath = path.join(soundsDir, sound.name);
        sound.mv(uploadPath, (err) => {
            if (err) return res.status(500).json({ error: 'Failed to upload sound' });
            return res.json({ success: true });
        });
    });

    // Tocar um som  
    app.post('/api/play-sound', (req, res) => {
        const soundId = Number(req.body.soundId);
        fs.readdir(soundsDir, (err, files) => {
            if (err) return res.status(500).json({ error: 'Failed to list sounds' });
            const sounds = files.filter(file => file.endsWith('.mp3'));
            if (soundId < 0 || soundId >= sounds.length) {
                return res.status(400).json({ error: 'Invalid sound ID' });
            }
            const soundPath = path.join(soundsDir, sounds[soundId]);
            playSoundInDiscord(soundPath);
            return res.json({ success: true });
        });
    });

    function playSoundInDiscord(soundPath) {
        const channel = client.channels.cache.get(process.env.VOICE_CHANNEL_ID);
        if (!channel) return console.error('Channel not found');

        // Entrar no canal de voz e garantir que o bot não está mutado ou surdo  
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,  // Garantir que o bot não está surdo  
            selfMute: false   // Garantir que o bot não está mudo  
        });

        // Criar o recurso de áudio e o player  
        const resource = createAudioResource(soundPath);
        const player = createAudioPlayer();

        // Tocar o som  
        player.play(resource);
        connection.subscribe(player);

        // Desconectar após o som ser tocado  
        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
        });
    }

    // Configuração do cliente Discord  
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

    client.once('ready', () => {
        console.log('Discord bot is ready');
    });

    client.login(process.env.DISCORD_TOKEN);

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
})();  
