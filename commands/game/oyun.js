const { MongoClient } = require('mongodb');
const config = require('../../config');
const orijinalSozlerBazasi = require('../../words');

let db, usersCollection;
const mongoClient = new MongoClient(config.MONGODB_URI);
const oyunlar = {}; 

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

// Mesaj göndərmə mexanizmini zəmanətli edirik
async function etibarliMesajGonder(client, options, chatId, text, mentions = [], message = null) {
    try {
        if (options && typeof options.reply === 'function') {
            await options.reply(text);
        } else if (client && typeof client.sendMessage === 'function') {
            await client.sendMessage(chatId, { text, mentions }, { quoted: message });
        }
    } catch (e) {
        console.error('❌ Mesaj göndərmə xətası:', e.message);
    }
}

async function novbetiSozeKec(client, chatId, options) {
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
        await etibarliMesajGonder(client, options, chatId, `💤 *Oyun Dayandırıldı!* Arxa-arxaya 2 sözə heç bir aktiv oyunçu cavab vermədiyi üçün oyun avtomatik bitdi.`);
        oyunuMexanikiDayandir(chatId);
        return;
    }

    sessiya.sozIndex += 1;

    if (sessiya.sozIndex >= sessiya.sozler.length) {
        await etibarliMesajGonder(client, options, chatId, `🏁 *Oyun başa çatdı!* Bütün sözlər bitdi. İştirak edən hər kəsə təşəkkürlər!`);
        oyunuMexanikiDayandir(chatId);
        return;
    }

    const yeniSoz = sessiya.sozler[sessiya.sozIndex];
    await etibarliMesajGonder(client, options, chatId, `⏰ *Vaxt tamam oldu! Növbəti sözə keçirik:* \n\n💡 İpucu: _${yeniSoz.ipucu}_\n🔍 Söz: *${yeniSoz.şablon}*`);

    sessiya.sozTaymeri = setTimeout(() => {
        novbetiSozeKec(client, chatId, options);
    }, 7000);
}

module.exports = {
    name: 'game',
    aliases: ['gm', 'oyun'],
    category: 'game',
    description: 'Qarışıq söz oyunu mexanizmi',
    usage: '.game, .oyun, .join, .stop, .top, .xal',

    async execute(client, message, args, options) {
        try {
            if (!message) return;
            
            // Framework fərqliliyini sığortalayırıq
            if (!message.from) message.from = message.key?.remoteJid;
            const chatId = message.from || message.key?.remoteJid;
            if (!chatId) return;

            const senderId = message.key.participant || message.key.remoteJid;
            const isGroup = true; // Sürətli keçid üçün aktivləşdirdik
            const cleanSender = senderId ? senderId.split('@')[0].split(':')[0] : 'Oyunçu';

            // Gələn əmri müəyyən edirik (çünki framework fərqli ötürə bilər)
            let textContent = message.body || '';
            if (message.message) {
                textContent = message.message.conversation || message.message.extendedTextMessage?.text || '';
            }
            const cmd = textContent.slice(1).trim().split(/\s+/)[0].toLowerCase();

            if (!usersCollection) return;

            // --- MENYU ---
            if (cmd === 'game' || cmd === 'gm') {
                const menuTxt = `🎮 *SÖZ OYUNU BOT MENYUSU:* 🎮\n\n` +
                `*👥 Qrup Daxili Komandalar:* \n` +
                `🎮 ➔ .oyun (Söz oyununu başladır)\n` +
                `➕ ➔ .join (Oyuna rəsmi qoşulur)\n` +
                `🚪 ➔ .unjoin (Oyundan ayrılır)\n` +
                `👥 ➔ .user (Aktiv oyunçu siyahısı)\n` +
                `💡 ➔ .ipucu (Gizli söz üçün ipucu -5 Xal)\n` +
                `📊 ➔ .xal (Sizin cari xalınız)\n` +
                `🏆 ➔ .top (Liderlər reytinq cədvəli)\n` +
                `🛑 ➔ .stop (Aktiv oyunu dayandırır)\n`;
                
                await etibarliMesajGonder(client, options, chatId, menuTxt, [], message);
                return;
            }

            // --- OYUNU BAŞLATMAQ ---
            if (cmd === 'oyun') {
                if (oyunlar[chatId]) {
                    await etibarliMesajGonder(client, options, chatId, '⚠️ Bu qrupda oyun onsuz da aktivdir!', [], message);
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

                await etibarliMesajGonder(client, options, chatId, startMesaji, [senderId], message);
                
                sessiya.sozTaymeri = setTimeout(() => {
                    novbetiSozeKec(client, chatId, options);
                }, 7000);
                return;
            }

            // --- OYUNA QOŞULMAQ ---
            if (cmd === 'join') {
                const sessiya = oyunlar[chatId];
                if (!sessiya || !sessiya.aktiv) {
                    await etibarliMesajGonder(client, options, chatId, '❌ Hazırda aktiv oyun yoxdur. Əvvəlcə `.oyun` yazaraq başladın.', [], message);
                    return;
                }
                if (sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(client, options, chatId, 'ℹ️ Siz onsuz da oyuna qoşulmusunuz!', [], message);
                    return;
                }

                sessiya.oyuncular.add(senderId);
                await etibarliMesajGonder(client, options, chatId, `✅ @${cleanSender} oyuna uğurla qoşuldu!`, [senderId], message);
                return;
            }

            // --- OYUNDAN AYRILMAQ ---
            if (cmd === 'unjoin') {
                const sessiya = oyunlar[chatId];
                if (!sessiya || !sessiya.aktiv) {
                    await etibarliMesajGonder(client, options, chatId, '❌ Hazırda aktiv bir oyun yoxdur.', [], message);
                    return;
                }
                if (!sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(client, options, chatId, 'ℹ️ Siz onsuz da bu oyunda deyilsiniz.', [], message);
                    return;
                }

                sessiya.oyuncular.delete(senderId);
                if (sessiya.oyuncular.size === 0) {
                    oyunuMexanikiDayandir(chatId);
                    await etibarliMesajGonder(client, options, chatId, `🚪 Aktiv oyunçu qalmadığı üçün oyun dayandırıldı.`);
                    return;
                }
                await etibarliMesajGonder(client, options, chatId, `🚪 @${cleanSender} oyundan ayrıldı.`, [senderId], message);
                return;
            }

            // --- İSTİFADƏÇİLƏR ---
            if (cmd === 'user') {
                if (!oyunlar[chatId]) {
                    await etibarliMesajGonder(client, options, chatId, '❌ Hazırda aktiv oyun yoxdur.', [], message);
                    return;
                }
                const list = Array.from(oyunlar[chatId].oyuncular);
                let tekst = `👥 *Aktiv Oyunçular (${list.length} nəfər):*\n\n`;
                list.forEach((id, idx) => { tekst += `${idx + 1}. @${id.split('@')[0]}\n`; });
                await etibarliMesajGonder(client, options, chatId, tekst, list, message);
                return;
            }

            // --- DAYANDIRMAQ ---
            if (cmd === 'stop') {
                if (oyunlar[chatId]) {
                    oyunuMexanikiDayandir(chatId);
                    await etibarliMesajGonder(client, options, chatId, '🛑 Oyun dayandırıldı və taymerlər sıfırlandı.', [], message);
                } else {
                    await etibarliMesajGonder(client, options, chatId, 'Hazırda dayandırılacaq aktiv oyun yoxdur.', [], message);
                }
                return;
            }

            // --- XAL VƏ REYTİNQ ---
            if (cmd === 'xal') {
                let userDoc = await usersCollection.findOne({ userId: senderId });
                await etibarliMesajGonder(client, options, chatId, `📊 Sizin cari xalınız: *${userDoc ? userDoc.xal : 0}*`, [], message);
                return;
            }

            if (cmd === 'top') {
                const topUsers = await usersCollection.find().sort({ xal: -1 }).limit(15).toArray();
                if (topUsers.length === 0) {
                    await etibarliMesajGonder(client, options, chatId, '📉 Siyahı boşdur.', [], message);
                    return;
                }
                let reytinq = `🏆 *TOP 15 LİDERLƏR REYTİNQİ* 🏆\n\n`;
                topUsers.forEach((u, i) => { reytinq += `${i + 1}. @${u.userId.split('@')[0]} ➔ *${u.xal} xal*\n`; });
                await etibarliMesajGonder(client, options, chatId, reytinq, topUsers.map(u => u.userId), message);
                return;
            }

            // --- İPUCU ---
            if (cmd === 'ipucu') {
                const sessiya = oyunlar[chatId];
                if (!sessiya) return;
                if (!sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(client, options, chatId, '⚠️ Əvvəlcə oyuna qoşulmalısınız! (`.join`)', [], message);
                    return;
                }

                if (!sessiya.ipucuLimitleri[senderId]) sessiya.ipucuLimitleri[senderId] = 0;
                if (sessiya.ipucuLimitleri[senderId] >= 4) {
                    await etibarliMesajGonder(client, options, chatId, '⚠️ İpucu limitiniz bitib (Maksimum 4).', [], message);
                    return;
                }

                let userDoc = await usersCollection.findOne({ userId: senderId });
                let currentXal = userDoc ? userDoc.xal : 0;
                if (currentXal < 5) {
                    await etibarliMesajGonder(client, options, chatId, `❌ Balansda kifayət qədər xal yoxdur (Xalınız: ${currentXal}).`, [], message);
                    return;
                }

                await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: -5 } });
                sessiya.ipucuLimitleri[senderId] += 1;

                const cariSoz = sessiya.sozler[sessiya.sozIndex];
                await etibarliMesajGonder(client, options, chatId, `💡 *İPUCU VERİLDİ* \n👤 @${cleanSender} (-5 Xal)\n📌 İpucu: _${cariSoz.ipucu}_\n🔍 Söz: *${cariSoz.şablon}*`, [senderId], message);
                return;
            }

            // --- CAVAB MEXANİZMİ ---
            const prefixList = ['.', '/', '#'];
            const isCommandMsg = prefixList.includes(textContent?.trim()[0]);

            if (oyunlar[chatId] && oyunlar[chatId].aktiv && !isCommandMsg) {
                const sessiya = oyunlar[chatId];
                if (!sessiya.oyuncular.has(senderId)) return;
                if (textContent.includes(" ")) return;

                const cariSoz = sessiya.sozler[sessiya.sozIndex];
                const answerAttempt = textContent.trim().toLowerCase();

                if (answerAttempt === cariSoz.cavab.toLowerCase()) {
                    if (sessiya.sozTaymeri) clearTimeout(sessiya.sozTaymeri);
                    sessiya.dogruCavabTapildi = true;

                    await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: 10 } }, { upsert: true });
                    let updatedDoc = await usersCollection.findOne({ userId: senderId });

                    await etibarliMesajGonder(client, options, chatId, `✅ *Doğru Cavab! @${cleanSender} (+10 Xal)*\n📊 Ümumi Balansınız: *${updatedDoc.xal} xal*`, [senderId], message);
                    novbetiSozeKec(client, chatId, options);
                } else {
                    let userDoc = await usersCollection.findOne({ userId: senderId });
                    let currentXal = userDoc ? userDoc.xal : 0;
                    if (currentXal > 0) {
                        await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: -5 } });
                    }
                }
            }
        } catch (error) {
            console.error('❌ Oyun Modulu İcra Xətası:', error);
        }
    }
};
