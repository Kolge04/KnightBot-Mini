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

// Həm birbaşa client, həm də handler-dən gələn ötürücülərlə uyğunlaşdırılmış mesaj göndərmə
async function etibarliMesajGonder(client, chatId, text, mentions = [], message = null) {
    try {
        if (client && typeof client.sendMessage === 'function') {
            await client.sendMessage(chatId, { text, mentions }, { quoted: message });
        }
    } catch (e) {
        console.error('❌ Mesaj göndərmə xətası:', e.message);
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
        await etibarliMesajGonder(client, chatId, `💤 *Oyun Dayandırıldı!* Arxa-arxaya 2 sözə heç bir aktiv oyunçu cavab vermədiyi üçün oyun avtomatik bitdi.`);
        oyunuMexanikiDayandir(chatId);
        return;
    }

    sessiya.sozIndex += 1;

    if (sessiya.sozIndex >= sessiya.sozler.length) {
        await etibarliMesajGonder(client, chatId, `🏁 *Oyun başa çatdı!* Bütün sözlər bitdi. İştirak edən hər kəsə təşəkkürlər!`);
        oyunuMexanikiDayandir(chatId);
        return;
    }

    const yeniSoz = sessiya.sozler[sessiya.sozIndex];
    await etibarliMesajGonder(client, chatId, `⏰ *Vaxt tamam oldu! Növbəti sözə keçirik:* \n\n💡 İpucu: _${yeniSoz.ipucu}_\n🔍 Söz: *${yeniSoz.şablon}*`);

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

    // 🌟 Framework-ün ORİJİNAL PARAMETR SIRALAMASI BƏRPA EDİLDİ
    async execute(client, message, cmd, rawText, args) {
        try {
            if (!message) return;
            
            if (!message.from) message.from = message.key?.remoteJid;
            const chatId = message.from || message.key?.remoteJid;
            if (!chatId) return;

            const senderId = message.key.participant || message.key.remoteJid;
            const isGroup = true; 
            const cleanSender = senderId ? senderId.split('@')[0].split(':')[0] : 'Oyunçu';

            // Framework-dən gələn cmd dəyişənini təmizləyirik
            const activeCmd = cmd ? cmd.toLowerCase().trim() : '';

            // Yazılan mətnin özünü təmiz şəkildə alırıq (Cavablar üçün)
            let textContent = (rawText || '').trim();
            if (!textContent && message.message) {
                textContent = message.message.conversation || message.message.extendedTextMessage?.text || '';
            }

            if (!usersCollection) return;

            // --- MENYU ---
            if (activeCmd === 'game' || activeCmd === 'gm') {
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
                
                await etibarliMesajGonder(client, chatId, menuTxt, [], message);
                return;
            }

            // --- OYUNU BAŞLATMAQ ---
            if (activeCmd === 'oyun') {
                if (oyunlar[chatId]) {
                    await etibarliMesajGonder(client, chatId, '⚠️ Bu qrupda oyun onsuz da aktivdir!', [], message);
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

                await etibarliMesajGonder(client, chatId, startMesaji, [senderId], message);
                
                sessiya.sozTaymeri = setTimeout(() => {
                    novbetiSozeKec(client, chatId);
                }, 7000);
                return;
            }

            // --- OYUNA QOŞULMAQ ---
            if (activeCmd === 'join') {
                const sessiya = oyunlar[chatId];
                if (!sessiya || !sessiya.aktiv) {
                    await etibarliMesajGonder(client, chatId, '❌ Hazırda aktiv oyun yoxdur. Əvvəlcə `.oyun` yazaraq başladın.', [], message);
                    return;
                }
                if (sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(client, chatId, 'ℹ️ Siz onsuz da oyuna qoşulmusunuz!', [], message);
                    return;
                }

                sessiya.oyuncular.add(senderId);
                await etibarliMesajGonder(client, chatId, `✅ @${cleanSender} oyuna uğurla qoşuldu!`, [senderId], message);
                return;
            }

            // --- OYUNDAN AYRILMAQ ---
            if (activeCmd === 'unjoin') {
                const sessiya = oyunlar[chatId];
                if (!sessiya || !sessiya.aktiv) {
                    await etibarliMesajGonder(client, chatId, '❌ Hazırda aktiv bir oyun yoxdur.', [], message);
                    return;
                }
                if (!sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(client, chatId, 'ℹ️ Siz onsuz da bu oyunda deyilsiniz.', [], message);
                    return;
                }

                sessiya.oyuncular.delete(senderId);
                if (sessiya.oyuncular.size === 0) {
                    oyunuMexanikiDayandir(chatId);
                    await etibarliMesajGonder(client, chatId, `🚪 Aktiv oyunçu qalmadığı üçün oyun dayandırıldı.`);
                    return;
                }
                await etibarliMesajGonder(client, chatId, `🚪 @${cleanSender} oyundan ayrıldı.`, [senderId], message);
                return;
            }

            // --- İSTİFADƏÇİLƏR ---
            if (activeCmd === 'user') {
                if (!oyunlar[chatId]) {
                    await etibarliMesajGonder(client, chatId, '❌ Hazırda aktiv oyun yoxdur.', [], message);
                    return;
                }
                const list = Array.from(oyunlar[chatId].oyuncular);
                let tekst = `👥 *Aktiv Oyunçular (${list.length} nəfər):*\n\n`;
                list.forEach((id, idx) => { tekst += `${idx + 1}. @${id.split('@')[0]}\n`; });
                await etibarliMesajGonder(client, chatId, tekst, list, message);
                return;
            }

            // --- DAYANDIRMAQ ---
            if (activeCmd === 'stop') {
                if (oyunlar[chatId]) {
                    oyunuMexanikiDayandir(chatId);
                    await etibarliMesajGonder(client, chatId, '🛑 Oyun dayandırıldı və taymerlər sıfırlandı.', [], message);
                } else {
                    await etibarliMesajGonder(client, chatId, 'Hazırda dayandırılacaq aktiv oyun yoxdur.', [], message);
                }
                return;
            }

            // --- XAL VƏ REYTİNQ ---
            if (activeCmd === 'xal') {
                let userDoc = await usersCollection.findOne({ userId: senderId });
                await etibarliMesajGonder(client, chatId, `📊 Sizin cari xalınız: *${userDoc ? userDoc.xal : 0}*`, [], message);
                return;
            }

            if (activeCmd === 'top') {
                const topUsers = await usersCollection.find().sort({ xal: -1 }).limit(15).toArray();
                if (topUsers.length === 0) {
                    await etibarliMesajGonder(client, chatId, '📉 Siyahı boşdur.', [], message);
                    return;
                }
                let reytinq = `🏆 *TOP 15 LİDERLƏR REYTİNQİ* 🏆\n\n`;
                topUsers.forEach((u, i) => { reytinq += `${i + 1}. @${u.userId.split('@')[0]} ➔ *${u.xal} xal*\n`; });
                await etibarliMesajGonder(client, chatId, reytinq, topUsers.map(u => u.userId), message);
                return;
            }

            // --- İPUCU ---
            if (activeCmd === 'ipucu') {
                const sessiya = oyunlar[chatId];
                if (!sessiya) return;
                if (!sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(client, chatId, '⚠️ Əvvəlcə oyuna qoşulmalısınız! (`.join`)', [], message);
                    return;
                }

                if (!sessiya.ipucuLimitleri[senderId]) sessiya.ipucuLimitleri[senderId] = 0;
                if (sessiya.ipucuLimitleri[senderId] >= 4) {
                    await etibarliMesajGonder(client, chatId, '⚠️ İpucu limitiniz bitib (Maksimum 4).', [], message);
                    return;
                }

                let userDoc = await usersCollection.findOne({ userId: senderId });
                let currentXal = userDoc ? userDoc.xal : 0;
                if (currentXal < 5) {
                    await etibarliMesajGonder(client, chatId, `❌ Balansda kifayət qədər xal yoxdur (Xalınız: ${currentXal}).`, [], message);
                    return;
                }

                await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: -5 } });
                sessiya.ipucuLimitleri[senderId] += 1;

                const cariSoz = sessiya.sozler[sessiya.sozIndex];
                await etibarliMesajGonder(client, chatId, `💡 *İPUCU VERİLDİ* \n👤 @${cleanSender} (-5 Xal)\n📌 İpucu: _${cariSoz.ipucu}_\n🔍 Söz: *${cariSoz.şablon}*`, [senderId], message);
                return;
            }

            // --- CAVAB MEXANİZMİ (Heç bir əmr daxil edilməyibsə)
            if (oyunlar[chatId] && oyunlar[chatId].aktiv && !activeCmd) {
                const sessiya = oyunlar[chatId];
                if (!sessiya.oyuncular.has(senderId)) return;
                
                const clearedText = textContent.trim().toLowerCase();
                if (clearedText.includes(" ") || clearedText.startsWith('.')) return;

                const cariSoz = sessiya.sozler[sessiya.sozIndex];

                if (clearedText === cariSoz.cavab.toLowerCase()) {
                    if (sessiya.sozTaymeri) clearTimeout(sessiya.sozTaymeri);
                    sessiya.dogruCavabTapildi = true;

                    await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: 10 } }, { upsert: true });
                    let updatedDoc = await usersCollection.findOne({ userId: senderId });

                    await etibarliMesajGonder(client, chatId, `✅ *Doğru Cavab! @${cleanSender} (+10 Xal)*\n📊 Ümumi Balansınız: *${updatedDoc.xal} xal*`, [senderId], message);
                    novbetiSozeKec(client, chatId);
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
