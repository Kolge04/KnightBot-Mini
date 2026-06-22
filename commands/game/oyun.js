const { MongoClient } = require('mongodb');
const config = require('../../config');
const orijinalSozlerBazasi = require('../../words');

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
        await client.sendMessage(chatId, { text: `💤 *Oyun Dayandırıldı!* Arxa-arxaya 2 sözə heç bir aktiv oyunçu cavab vermədiyi üçün oyun avtomatik bitdi.` });
        oyunuMexanikiDayandir(chatId);
        return;
    }

    sessiya.sozIndex += 1;

    if (sessiya.sozIndex >= sessiya.sozler.length) {
        await client.sendMessage(chatId, { text: `🏁 *Oyun başa çatdı!* Bütün sözlər bitdi. İştirak edən hər kəsə təşəkkürlər!` });
        oyunuMexanikiDayandir(chatId);
        return;
    }

    const yeniSoz = sessiya.sozler[sessiya.sozIndex];
    await client.sendMessage(chatId, { text: `⏰ *Vaxt tamam oldu! Növbəti sözə keçirik:* \n\n💡 İpucu: _${yeniSoz.ipucu}_\n🔍 Söz: *${yeniSoz.şablon}*` });

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
        // Baileys üçün mesaj məlumatlarını təhlükəsiz şəkildə alırıq
        if (!message) return;
        
        // 🌟 XƏTANIN QARŞISINI ALMAQ ÜÇÜN BURA ƏLAVƏ EDİLDİ:
        if (!message.from) message.from = message.key?.remoteJid;
        
        // Knightbot framework-ünə uyğun chatId və senderId təyini
        const chatId = message.from || message.key?.remoteJid;
        if (!chatId) return;

        const senderId = message.key.participant || message.key.remoteJid;
        
        // 🌟 @lid QRUPLARINI DƏSTƏKLƏMƏK ÜÇÜN BU SƏTİR DƏYİŞDİRİLDİ:
        const isGroup = true;
        
        const cleanSender = senderId ? senderId.split('@')[0].split(':')[0] : 'Oyunçu';

        if (!usersCollection) return;

        
        // --- MENYU / MEZMUN ---
        if (cmd === 'game' || cmd === 'gm') {
            await client.sendMessage(chatId, { 
                text: `🎮 *SÖZ OYUNU BOT MENYUSU:* 🎮\n\n` +
                `*👥 Qrup Daxili Komandalar:* \n` +
                `*🎮 ➔ .oyun (Söz oyununu başladır)*\n` +
                `*➕ ➔ .join (Oyuna rəsmi qoşulur)*\n` +
                `*🚪 ➔ .unjoin (Oyundan ayrılır)*\n` +
                `*👥 ➔ .user (Aktiv oyunçu siyahısı)*\n` +
                `*💡 ➔ .ipucu (Gizli söz üçün ipucu -5 Xal)*\n` +
                `*📊 ➔ .xal (Sizin cari xalınız)*\n` +
                `*🏆 ➔ .top (Liderlər reytinq cədvəli)*\n` +
                `*🛑 ➔ .stop (Aktiv oyunu dayandırır)*\n`
            }, { quoted: message });
            return;
        }

        // --- OYUNU BAŞLATMAQ ---
        if (cmd === 'oyun') {
            if (oyunlar[chatId]) {
                await client.sendMessage(chatId, { text: '⚠️ Bu qrupda oyun onsuz da aktivdir və ya gözləmədədir!' }, { quoted: message });
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

            await client.sendMessage(chatId, { text: startMesaji, mentions: [senderId] });
            
            sessiya.sozTaymeri = setTimeout(() => {
                novbetiSozeKec(client, chatId);
            }, 7000);
            return;
        }

        // --- OYUNA QOŞULMAQ ---
        if (cmd === 'join') {
            const sessiya = oyunlar[chatId];
            if (!sessiya || !sessiya.aktiv) {
                await client.sendMessage(chatId, { text: '❌ Hazırda aktiv oyun yoxdur. Əvvəlcə `.oyun` yazaraq başladın.' }, { quoted: message });
                return;
            }
            if (sessiya.oyuncular.has(senderId)) {
                await client.sendMessage(chatId, { text: 'ℹ️ Siz onsuz da oyuna qoşulmusunuz!' }, { quoted: message });
                return;
            }

            sessiya.oyuncular.add(senderId);
            await client.sendMessage(chatId, { text: `✅ @${cleanSender} oyuna uğurla qoşuldu!`, mentions: [senderId] });
            return;
        }

        // --- OYUNDAN AYRILMAQ ---
        if (cmd === 'unjoin') {
            const sessiya = oyunlar[chatId];
            if (!sessiya || !sessiya.aktiv) {
                await client.sendMessage(chatId, { text: '❌ Hazırda aktiv bir oyun yoxdur.' }, { quoted: message });
                return;
            }
            if (!sessiya.oyuncular.has(senderId)) {
                await client.sendMessage(chatId, { text: 'ℹ️ Siz onsuz da bu oyunda deyilsiniz.' }, { quoted: message });
                return;
            }

            sessiya.oyuncular.delete(senderId);
            if (sessiya.oyuncular.size === 0) {
                oyunuMexanikiDayandir(chatId);
                await client.sendMessage(chatId, { text: `🚪 Aktiv oyunçu qalmadığı üçün oyun dayandırıldı.` });
                return;
            }
            await client.sendMessage(chatId, { text: `🚪 @${cleanSender} oyundan ayrıldı.`, mentions: [senderId] });
            return;
        }

        // --- İSTİFADƏÇİLƏR ---
        if (cmd === 'user') {
            if (!oyunlar[chatId]) {
                await client.sendMessage(chatId, { text: '❌ Hazırda aktiv oyun yoxdur.' }, { quoted: message });
                return;
            }
            const list = Array.from(oyunlar[chatId].oyuncular);
            let tekst = `👥 *Aktiv Oyunçular (${list.length} nəfər):*\n\n`;
            list.forEach((id, idx) => { tekst += `${idx + 1}. @${id.split('@')[0]}\n`; });
            await client.sendMessage(chatId, { text: tekst, mentions: list });
            return;
        }

        // --- DAYANDIRMAQ ---
        if (cmd === 'stop') {
            if (oyunlar[chatId]) {
                oyunuMexanikiDayandir(chatId);
                await client.sendMessage(chatId, { text: '🛑 Oyun dayandırıldı və taymerlər sıfırlandı.' }, { quoted: message });
            } else {
                await client.sendMessage(chatId, { text: 'Hazırda dayandırılacaq aktiv oyun yoxdur.' }, { quoted: message });
            }
            return;
        }

        // --- XAL VƏ REYTİNQ ---
        if (cmd === 'xal') {
            let userDoc = await usersCollection.findOne({ userId: senderId });
            await client.sendMessage(chatId, { text: `📊 Sizin cari xalınız: *${userDoc ? userDoc.xal : 0}*` }, { quoted: message });
            return;
        }

        if (cmd === 'top') {
            const topUsers = await usersCollection.find().sort({ xal: -1 }).limit(15).toArray();
            if (topUsers.length === 0) {
                await client.sendMessage(chatId, { text: '📉 Siyahı boşdur.' }, { quoted: message });
                return;
            }
            let reytinq = `🏆 *TOP 15 LİDERLƏR REYTİNQİ* 🏆\n\n`;
            topUsers.forEach((u, i) => { reytinq += `${i + 1}. @${u.userId.split('@')[0]} ➔ *${u.xal} xal*\n`; });
            await client.sendMessage(chatId, { text: reytinq, mentions: topUsers.map(u => u.userId) });
            return;
        }

        // --- İPUCU ---
        if (cmd === 'ipucu') {
            const sessiya = oyunlar[chatId];
            if (!sessiya) return;
            if (!sessiya.oyuncular.has(senderId)) {
                await client.sendMessage(chatId, { text: '⚠️ Əvvəlcə oyuna qoşulmalısınız! (`.join`)' }, { quoted: message });
                return;
            }

            if (!sessiya.ipucuLimitleri[senderId]) sessiya.ipucuLimitleri[senderId] = 0;
            if (sessiya.ipucuLimitleri[senderId] >= 4) {
                await client.sendMessage(chatId, { text: '⚠️ İpucu limitiniz bitib (Maksimum 4).' }, { quoted: message });
                return;
            }

            let userDoc = await usersCollection.findOne({ userId: senderId });
            let currentXal = userDoc ? userDoc.xal : 0;
            if (currentXal < 5) {
                await client.sendMessage(chatId, { text: `❌ Balansda kifayət qədər xal yoxdur (Xalınız: ${currentXal}).` }, { quoted: message });
                return;
            }

            await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: -5 } });
            sessiya.ipucuLimitleri[senderId] += 1;

            const cariSoz = sessiya.sozler[sessiya.sozIndex];
            await client.sendMessage(chatId, { text: `💡 *İPUCU VERİLDİ* \n👤 @${cleanSender} (-5 Xal)\n📌 İpucu: _${cariSoz.ipucu}_\n🔍 Söz: *${cariSoz.şablon}*`, mentions: [senderId] });
            return;
        }

        // --- CAVAB MEXANİZMİ ---
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

                await client.sendMessage(chatId, { text: `✅ *Doğru Cavab! @${cleanSender} (+10 Xal)*\n📊 Ümumi Balansınız: *${updatedDoc.xal} xal*`, mentions: [senderId] });
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
