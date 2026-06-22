const { MongoClient } = require('mongodb');
const config = require('../../config');
const orijinalSozlerBazasi = require('../../words'); // word/js strukturuna görə tənzimləndi

let db, usersCollection;
const mongoClient = new MongoClient(config.MONGODB_URI);
const oyunlar = {}; // Hər qrup üçün sessiyalar

// Verilənlər bazası bağlantısı
async function connectDB() {
    try {
        await mongoClient.connect();
        db = mongoClient.db('wp_game_bot');
        usersCollection = db.collection('users');
        await usersCollection.createIndex({ userId: 1 }, { unique: true });
        await usersCollection.createIndex({ xal: -1 });
        await usersCollection.createIndex({ mesajSayi: -1 });
        console.log('✅ Oyun Modulu: MongoDB-yə qoşuldu!');
    } catch (err) {
        console.error('❌ Oyun Modulu: MongoDB xətası:', err);
    }
}
connectDB();

function qarisdir(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function oyunuMexanikiDayandir(chatId) {
    if (oyunlar[chatId]) {
        if (oyunlar[chatId].sozTaymeri) clearTimeout(oyunlar[chatId].sozTaymeri);
        delete oyunlar[chatId];
    }
}

async function novbetiSozeKec(client, chatId) {
    const sessiya = oyunlar[chatId];
    if (!sessiya || !sessiya.aktiv) return;

    if (sessiya.sozTaymeri) clearTimeout(sessiya.sozTaymeri);

    if (!sessiya.dogruCavabTapildi) {
        sessiya.cavabsizSozSayi += 1;
    } else {
        sessiya.cavabsizSozSayi = 0;
        sessiya.dogruCavabTapildi = false;
    }

    if (sessiya.cavabsizSozSayi >= 2) {
        await client.sendMessage(chatId, `💤 *Oyun Dayandırıldı!* Arxa-arxaya 2 sözə heç bir aktiv oyunçu cavab vermədiyi üçün oyun avtomatik bitdi.`);
        oyunuMexanikiDayandir(chatId);
        return;
    }

    sessiya.sozIndex += 1;

    if (sessiya.sozIndex >= sessiya.sozler.length) {
        await client.sendMessage(chatId, `🏁 *Oyun başa çatdı!* Bütün sözlər bitdi. İştirak edən hər kəsə təşəkkürlər!`);
        oyunuMexanikiDayandir(chatId);
        return;
    }

    const yeniSoz = sessiya.sozler[sessiya.sozIndex];
    await client.sendMessage(chatId, `⏰ *Vaxt tamam oldu! Növbəti sözə keçirik:* \n\n💡 İpucu: _${yeniSoz.ipucu}_\n🔍 Söz: *${yeniSoz.şablon}*`);

    sessiya.sozTaymeri = setTimeout(() => {
        novbetiSozeKec(client, chatId);
    }, 7000);
}

module.exports = {
    name: 'game',
    aliases: ['gm', 'oyun'],
    category: 'game',
    description: 'Qarışıq söz oyunu mexanizmi',
    usage: '.game, .oyun, .join, .stop, .top, .xal',

    async execute(client, message, cmd, rawText, args) {
        // Əgər message və ya message.from mövcut deyilsə, funksiyanı dayandır ki, bot çökməsin
        if (!message || !message.from) return;

        const chatId = message.from;
        const senderId = message.author || message.from;
        
        // chatId-nin təhlükəsiz şəkildə string olduğunu yoxlayırıq
        const isGroup = typeof chatId === 'string' && chatId.endsWith('@g.us');
        
        // senderId təhlükəsizlik yoxlaması
        const cleanSender = senderId && typeof senderId === 'string' 
            ? senderId.split('@')[0].split(':')[0] 
            : 'İstifadəçi';

        if (!usersCollection) return;

        // Qrup daxili mesaj sayğacı (Oyun əmri deyilsə)
        if (isGroup && !['game', 'gm', 'oyun', 'join', 'unjoin', 'user', 'stop', 'xal', 'top', 'clear', 'ipucu'].includes(cmd) && !cmd) {
            await usersCollection.updateOne(
                { userId: senderId },
                { $inc: { mesajSayi: 1 } },
                { upsert: true }
            );
        }

        // --- MENYU / MEZMUN ---
        if (cmd === 'game' || cmd === 'gm') {
            await message.reply(
                `🎮 *SÖZ OYUNU BOT MENYUSU:* 🎮\n\n` +
                `*👥 Qrup Daxili Komandalar:* \n` +
                `🎮 ➔ .oyun (Söz oyununu başladır)\n` +
                `➕ ➔ .join (Oyuna rəsmi qoşulur)\n` +
                `🚪 ➔ .unjoin (Oyundan ayrılır)\n` +
                `👥 ➔ .user (Aktiv oyunçu siyahısı)\n` +
                `💡 ➔ .ipucu (Gizli söz üçün ipucu -5 Xal)\n` +
                `📊 ➔ .xal (Sizin cari xalınız)\n` +
                `🏆 ➔ .top (Liderlər reytinq cədvəli)\n` +
                `🛑 ➔ .stop (Aktiv oyunu dayandırır)\n`,
                null,
                { linkPreview: false }
            );
            return;
        }

        // --- OYUNU BAŞLATMAQ ---
        if (cmd === 'oyun') {
            if (oyunlar[chatId]) {
                await message.reply('⚠️ Bu qrupda oyun onsuz da aktivdir və ya gözləmədədir!');
                return;
            }

            oyunlar[chatId] = {
                aktiv: true,
                sozler: qarisdir(orijinalSozlerBazasi),
                sozIndex: 0,
                oyuncular: new Set([senderId]), 
                ipucuLimitleri: {},
                sozTaymeri: null,
                cavabsizSozSayi: 0,       
                dogruCavabTapildi: false  
            };

            const sessiya = oyunlar[chatId];
            const cariSoz = sessiya.sozler[sessiya.sozIndex];

            const startMesaji = `🎮 *SÖZ OYUNU BAŞLADI!* 🎮\n\n👤 Oyunu başladan və ilk qoşulan: @${cleanSender}\n📢 Digər iştirakçılar qoşulmaq üçün .join yazmalıdır!\n\n⏱️ *HƏR SÖZ ÜÇÜN CƏMİ 7 SANİYƏNİZ VAR!*\n\n💡 İpucu: _${cariSoz.ipucu}_\n🔍 Söz: *${cariSoz.şablon}*`;

            await client.sendMessage(chatId, startMesaji);
            
            sessiya.sozTaymeri = setTimeout(() => {
                novbetiSozeKec(client, chatId);
            }, 7000);
            return;
        }

        // --- OYUNA QOŞULMAQ ---
        if (cmd === 'join') {
            const sessiya = oyunlar[chatId];
            if (!sessiya || !sessiya.aktiv) return message.reply('❌ Hazırda aktiv oyun yoxdur. Əvvəlcə `.oyun` yazaraq başladın.');
            if (sessiya.oyuncular.has(senderId)) return message.reply('ℹ️ Siz onsuz da oyuna qoşulmusunuz!');

            sessiya.oyuncular.add(senderId);
            await client.sendMessage(chatId, `✅ @${cleanSender} oyuna uğurla qoşuldu!`);
            return;
        }

        // --- OYUNDAN AYRILMAQ ---
        if (cmd === 'unjoin') {
            const sessiya = oyunlar[chatId];
            if (!sessiya || !sessiya.aktiv) return message.reply('❌ Hazırda aktiv bir oyun yoxdur.');
            if (!sessiya.oyuncular.has(senderId)) return message.reply('ℹ️ Siz onsuz da bu oyunda deyilsiniz.');

            sessiya.oyuncular.delete(senderId);
            if (sessiya.oyuncular.size === 0) {
                oyunuMexanikiDayandir(chatId);
                await client.sendMessage(chatId, `🚪 Aktiv oyunçu qalmadığı üçün oyun dayandırıldı.`);
                return;
            }
            await client.sendMessage(chatId, `🚪 @${cleanSender} oyundan ayrıldı.`);
            return;
        }

        // --- İSTİFADƏÇİLƏR ---
        if (cmd === 'user') {
            if (!oyunlar[chatId]) return message.reply('❌ Hazırda aktiv oyun yoxdur.');
            const list = Array.from(oyunlar[chatId].oyuncular);
            let tekst = `👥 *Aktiv Oyunçular (${list.length} nəfər):*\n\n`;
            list.forEach((id, idx) => { tekst += `${idx + 1}. @${id.split('@')[0]}\n`; });
            await client.sendMessage(chatId, tekst, { mentions: list });
            return;
        }

        // --- DAYANDIRMAQ ---
        if (cmd === 'stop') {
            if (oyunlar[chatId]) {
                oyunuMexanikiDayandir(chatId);
                await message.reply('🛑 Oyun dayandırıldı və taymerlər sıfırlandı.');
            } else {
                await message.reply('Hazırda dayandırılacaq aktiv oyun yoxdur.');
            }
            return;
        }

        // --- XAL VƏ REYTİNQ ---
        if (cmd === 'xal') {
            let userDoc = await usersCollection.findOne({ userId: senderId });
            await message.reply(`📊 Sizin cari xalınız: *${userDoc ? userDoc.xal : 0}*`);
            return;
        }

        if (cmd === 'top') {
            const topUsers = await usersCollection.find().sort({ xal: -1 }).limit(15).toArray();
            if (topUsers.length === 0) return message.reply('📉 Siyahı boşdur.');
            let reytinq = `🏆 *TOP 15 LİDERLƏR REYTİNQİ* 🏆\n\n`;
            topUsers.forEach((u, i) => { reytinq += `${i + 1}. @${u.userId.split('@')[0]} ➔ *${u.xal} xal*\n`; });
            await client.sendMessage(chatId, reytinq, { mentions: topUsers.map(u => u.userId) });
            return;
        }

        // --- İPUCU ---
        if (cmd === 'ipucu') {
            const sessiya = oyunlar[chatId];
            if (!sessiya) return;
            if (!sessiya.oyuncular.has(senderId)) return message.reply('⚠️ Əvvəlcə oyuna qoşulmalısınız! (`.join`)');

            if (!sessiya.ipucuLimitleri[senderId]) sessiya.ipucuLimitleri[senderId] = 0;
            if (sessiya.ipucuLimitleri[senderId] >= 4) return message.reply('⚠️ İpucu limitiniz bitib (Maksimum 4).');

            let userDoc = await usersCollection.findOne({ userId: senderId });
            let currentXal = userDoc ? userDoc.xal : 0;
            if (currentXal < 5) return message.reply(`❌ Balansda kifayət qədər xal yoxdur (Xalınız: ${currentXal}).`);

            await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: -5 } });
            sessiya.ipucuLimitleri[senderId] += 1;

            const cariSoz = sessiya.sozler[sessiya.sozIndex];
            await client.sendMessage(chatId, `💡 *İPUCU VERİLDİ* \n👤 @${cleanSender} (-5 Xal)\n📌 İpucu: _${cariSoz.ipucu}_\n🔍 Söz: *${cariSoz.şablon}*`, { mentions: [senderId] });
            return;
        }

        // --- CAVAB MEXANİZMİ (Əgər komanda deyilsə və oyun aktivdirsə)
        if (oyunlar[chatId] && oyunlar[chatId].aktiv && !cmd) {
            const sessiya = oyunlar[chatId];
            if (!sessiya.oyuncular.has(senderId)) return;
            if (rawText.includes(" ")) return;

            const cariSoz = sessiya.sozler[sessiya.sozIndex];
            const answerAttempt = rawText.toLowerCase();

            if (answerAttempt === cariSoz.cavab) {
                if (sessiya.sozTaymeri) clearTimeout(sessiya.sozTaymeri);
                sessiya.dogruCavabTapildi = true;

                await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: 10 } }, { upsert: true });
                let updatedDoc = await usersCollection.findOne({ userId: senderId });

                await client.sendMessage(chatId, `✅ *Doğru Cavab! @${cleanSender} (+10 Xal)*\n📊 Ümumi Balansınız: *${updatedDoc.xal} xal*`);
                novbetiSozeKec(client, chatId);
            } else {
                let userDoc = await usersCollection.findOne({ userId: senderId });
                let currentXal = userDoc ? userDoc.xal : 0;
                if (currentXal > 0) {
                    await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: -5 } });
                }
            }
        }
    }
};
