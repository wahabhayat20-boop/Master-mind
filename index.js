const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Root route to ensure index.html loads
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Keep-alive endpoint for UptimeRobot / Koyeb
app.get('/ping', (req, res) => res.send('MASTER MIND BOT ONLINE!'));

// API Endpoint for Pairing Code
app.post('/api/pair', async (req, res) => {
    let { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Number enter karein!' });

    number = number.replace(/[^0-9]/g, '');

    try {
        const sessionPath = path.join(__dirname, 'sessions', number);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        sock.ev.on('creds.update', saveCreds);

        // Request Pairing Code if not registered
        if (!sock.authState.creds.registered) {
            await delay(2000);
            const code = await sock.requestPairingCode(number);
            res.json({ success: true, code: code });
        } else {
            res.json({ success: true, message: 'Already connected!' });
        }

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    // Auto-reconnect logic
                }
            } else if (connection === 'open') {
                console.log(`[+] WhatsApp connected for: ${number}`);
            }
        });

        // Main Bot Command Handler
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const text = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         msg.message.imageMessage?.caption || '';

            const prefix = '.';
            if (!text.startsWith(prefix)) return;

            const args = text.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            // Full Menu Command with Image
            if (command === 'menu' || command === 'help') {
                const imageUrl = 'https://cdn.phototourl.com/free/2026-09-20-69beb658-b75d-4cd8-a291-0f3656dfcb02.jpg';

                const fullMenu = `╭━━━〔 🔥 𝙈𝘼𝙎𝙏𝙀𝙍 𝙈𝙄𝙉𝘿 𝙈𝘿 𝘽𝙊𝙏 🔥 〕━━━╮
┃ 
┃ ⚙️ Prefix : [ . ]
┃ 👤 Owner  : Master Mind
┃ ⚡ Speed  : 0.02s
┃
┣━━━⪧ ⚙️ 𝘼𝙐𝙏𝙊 𝙎𝙀𝙏𝙏𝙄𝙉𝙂𝙎
┃
┃ ◈ .autoreact on/off
┃ ◈ .autostatusview on/off
┃ ◈ .autostatuslike on/off
┃ ◈ .welcome on/off
┃ ◈ .goodbye on/off
┃
┣━━━⪧ 👥 𝙂𝙍𝙊𝙐𝙋 𝘾𝙊𝙉𝙏𝙍𝙊𝙇 & 𝙎𝙀𝘾𝙐𝙍𝙄𝙏𝙔
┃ 
┃ ◈ .tagall
┃ ◈ .hidetag
┃ ◈ .adminlist
┃ ◈ .groupinfo
┃ ◈ .kick
┃ ◈ .add
┃ ◈ .promote / .demote
┃ ◈ .p / .d
┃ ◈ .group open/close
┃ ◈ .link / .revoke / .resetlink
┃ ◈ .setname / .setdesc
┃ ◈ .setpp / .setfullpp
┃ ◈ .mute / .unmute
┃ ◈ .antilink on/off
┃ ◈ .antistatus on/off
┃ ◈ .antispam on/off
┃ ◈ .antibot on/off
┃ ◈ .antiword on/off
┃ ◈ .antidelete on/off
┃ ◈ .antidemote on/off
┃ ◈ .antipromote on/off
┃ ◈ .nsfw on/off
┃ ◈ .warn / .unwarn
┃ ◈ .poll / .del
┃
┣━━━⪧ 🕵️ 𝙎𝙀𝘾𝙍𝙀𝙏 𝙏𝙊𝙊𝙇𝙎
┃
┃ ◈ .vv
┃ ◈ .quoted
┃
┣━━━⪧ 🔄 𝙈𝙀𝘿𝙄𝘼 𝘾𝙊𝙉𝑑𝙀𝙍𝙏𝙀𝙍𝙎 & 𝙀𝘿𝙄𝙏𝙊𝙍𝙎
┃
┃ ◈ .s / .sticker
┃ ◈ .toimg / .toimage
┃ ◈ .tomp3 / .tovoice
┃ ◈ .tourl
┃ ◈ .removebg
┃
┣━━━⪧ 📥 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿𝙀𝙍
┃
┃ ◈ .play / .song
┃ ◈ .video / .ytmp4
┃ ◈ .ig / .instagram
┃ ◈ .fb / .facebook
┃ ◈ .tiktok / .tt
┃ ◈ .apk
┃ ◈ .mediafire
┃
┣━━━⪧ 🎮 𝙁𝙐𝙉 & 𝙂𝘼𝙈𝙀𝙎
┃
┃ ◈ .truth / .dare
┃ ◈ .tictactoe
┃ ◈ .ship / .match
┃ ◈ .roast / .slap
┃
┣━━━⪧ 🤖 𝘼𝙄 𝘾𝙃𝘼𝙏 & 𝙏𝙊𝙊𝙇𝙎
┃
┃ ◈ .ai
┃ ◈ .gpt
┃ ◈ .tr / .translate
┃ ◈ .ocr
┃
┣━━━⪧ 🛠️ 𝙐𝙏𝙄𝙇𝙄𝙏𝙄𝙀𝙎 & 𝙎𝙔𝙎𝙏𝙀𝙈
┃
┃ ◈ .google
┃ ◈ .weather
┃ ◈ .ping / .speed
┃ ◈ .runtime / .uptime
┃ ◈ .clearcache
┃ ◈ .readmore
┃
┣━━━⪧ 💎 𝙋𝙍𝙀𝙈𝙄𝙐𝙈 & 𝙀𝘾𝙊𝙉𝙊𝙈𝙔
┃
┃ ◈ .daily / .claim
┃ ◈ .balance / .wallet
┃ ◈ .addpremium
┃ ◈ .delpremium
┃
┣━━━⪧ 👑 𝙊𝙒𝙉𝙀𝙍 𝙊𝙉𝙇𝙔
┃
┃ ◈ .public
┃ ◈ .private
┃ ◈ .restart
┃ ◈ .ban / .unban
┃ ◈ .setprefix
┃ ◈ .block / .unblock
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

                await sock.sendMessage(from, { 
                    image: { url: imageUrl }, 
                    caption: fullMenu 
                }, { quoted: msg });
            }

            // Ping Command
            else if (command === 'ping' || command === 'speed') {
                const start = Date.now();
                await sock.sendMessage(from, { text: 'Testing speed...' });
                const end = Date.now();
                await sock.sendMessage(from, { text: `⚡ Speed: ${end - start}ms` });
            }

            // Tagall Command (Groups Only)
            else if (command === 'tagall') {
                if (!isGroup) return sock.sendMessage(from, { text: 'Ye command sirf groups ke liye hai!' });
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                let textMsg = `👥 *Group Tag All*\n\n`;
                let mentions = [];
                for (let mem of participants) {
                    textMsg += `@${mem.id.split('@')[0]}\n`;
                    mentions.push(mem.id);
                }
                await sock.sendMessage(from, { text: textMsg, mentions: mentions });
            }

        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Pairing code generate nahi ho saka.' });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
          
