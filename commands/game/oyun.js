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

async function etibarliMesajGonder(sock, chatId, text, mentions = [], msg = null) {
    try {
        if (sock && typeof sock.sendMessage === 'function') {
            await sock.sendMessage(chatId, { text, mentions }, { quoted: msg });
        }
    } catch (e) {
        console.error('❌ Mesaj göndərmə xətası:', e.message);
    }
}

async function novbetiSozeKec(sock, chatId) {
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
        await etibarliMesajGonder(sock, chatId, `💤 *Oyun Dayandırıldı!* Arxa-arxaya 2 sözə heç bir aktiv oyunçu cavab vermədiyi üçün oyun avtomatik bitdi.`);
        oyunuMexanikiDayandir(chatId);
        return;
    }

    sessiya.sozIndex += 1;

    if (sessiya.sozIndex >= sessiya.sozler.length) {
        await etibarliMesajGonder(sock, chatId, `🏁 *Oyun başa çatdı!* Bütün sözlər bitdi. İştirak edən hər kəsə təşəkkürlər!`);
        oyunuMexanikiDayandir(chatId);
        return;
    }

    const yeniSoz = sessiya.sozler[sessiya.sozIndex];
    await etibarliMesajGonder(sock, chatId, `⏰ *Vaxt tamam oldu! Növbəti sözə keçirik:* \n\n💡 İpucu: _${yeniSoz.ipucu}_\n🔍 Söz: *${yeniSoz.şablon}*`);

    sessiya.sozTaymeri = setTimeout(() => {
        novbetiSozeKec(sock, chatId);
    }, 7000);
}

module.exports = {
    name: 'game',
    aliases: ['gm', 'oyun', 'join', 'unjoin', 'stop', 'top', 'xal', 'ipucu', 'user'],
    category: 'game',
    description: 'Framework-ə tam uyğunlaşdırılmış söz oyunu',
    usage: '.oyun, .join, .stop, .top, .xal, .ipucu',

    async execute(sock, msg, args, options) {
        try {
            if (!msg) return;
            
            const chatId = options?.from || msg.key?.remoteJid;
            const senderId = options?.sender || msg.key?.participant || msg.key?.remoteJid;
            if (!chatId || !senderId) return;

            const cleanSender = senderId.split('@')[0].split(':')[0];

            // Hansı əmrin yazıldığını bəlli edirik
            let textContent = '';
            if (msg.body) textContent = msg.body;
            else if (msg.message) textContent = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            textContent = textContent.trim();

            let activeCmd = '';
            if (textContent.startsWith(config.prefix)) {
                activeCmd = textContent.slice(config.prefix.length).trim().split(/\s+/)[0].toLowerCase();
            }

            if (!usersCollection) return;

            // --- 1. MENYU ---
            if (activeCmd === 'game' || activeCmd === 'gm') {
                const menuTxt = `🎮 *SÖZ OYUNU BOT MENYUSU:* 🎮\n\n` +
                `🎮 ➔ .oyun (Söz oyununu başladır)\n` +
                `➕ ➔ .join (Oyuna rəsmi qoşulur)\n` +
                `🚪 ➔ .unjoin (Oyundan ayrılır)\n` +
                `👥 ➔ .user (Aktiv oyunçu siyahısı)\n` +
                `💡 ➔ .ipucu (Gizli söz üçün ipucu -5 Xal)\n` +
                `📊 ➔ .xal (Sizin cari xalınız)\n` +
                `🏆 ➔ .top (Liderlər reytinq cədvəli)\n` +
                `🛑 ➔ .stop (Aktiv oyunu dayandırır)\n\n` +
                `📝 *Qeyd:* Cavabları yazarkən əvvəlinə nöqtə qoymayın! Sadəcə cavabın özünü yazın (Məs: Kitab).`;
                
                await etibarliMesajGonder(sock, chatId, menuTxt, [], msg);
                return;
            }

            // --- 2. OYUNU BAŞLATMAQ ---
            if (activeCmd === 'oyun') {
                if (oyunlar[chatId]) {
                    await etibarliMesajGonder(sock, chatId, '⚠️ Bu qrupda oyun onsuz da aktivdir!', [], msg);
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

                const startMesaji = `🎮 *SÖZ OYUNU BAŞLADI!* 🎮\n\n👤 Oyunu başladan və ilk qoşulan: @${cleanSender}\n📢 Digər iştirakçılar qoşulmaq üçün *.join* yazmalıdır!\n\n⏱️ *HƏR SÖZ ÜÇÜN CƏMİ 7 SANİYƏNİZ VAR!*\n\n💡 İpucu: _${cariSoz.ipucu}_\n🔍 Söz: *${cariSoz.şablon}*`;

                await etibarliMesajGonder(sock, chatId, startMesaji, [senderId], msg);
                
                sessiya.sozTaymeri = setTimeout(() => {
                    novbetiSozeKec(sock, chatId);
                }, 7000);
                return;
            }

            // --- 3. OYUNA QOŞULMAQ ---
            if (activeCmd === 'join') {
                const sessiya = oyunlar[chatId];
                if (!sessiya || !sessiya.aktiv) {
                    await etibarliMesajGonder(sock, chatId, '❌ Hazırda aktiv oyun yoxdur. Əvvəlcə `.oyun` yazaraq başladın.', [], msg);
                    return;
                }
                if (sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(sock, chatId, 'ℹ️ Siz onsuz da oyuna qoşulmusunuz!', [], msg);
                    return;
                }

                sessiya.oyuncular.add(senderId);
                await etibarliMesajGonder(sock, chatId, `✅ @${cleanSender} oyuna uğurla qoşuldu!`, [senderId], msg);
                return;
            }

            // --- 4. OYUNDAN AYRILMAQ ---
            if (activeCmd === 'unjoin') {
                const sessiya = oyunlar[chatId];
                if (!sessiya || !sessiya.aktiv) {
                    await etibarliMesajGonder(sock, chatId, '❌ Hazırda aktiv bir oyun yoxdur.', [], msg);
                    return;
                }
                if (!sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(sock, chatId, 'ℹ️ Siz onsuz da bu oyunda deyilsiniz.', [], msg);
                    return;
                }

                sessiya.oyuncular.delete(senderId);
                if (sessiya.oyuncular.size === 0) {
                    oyunuMexanikiDayandir(chatId);
                    await etibarliMesajGonder(sock, chatId, `🚪 Aktiv oyunçu qalmadığı üçün oyun dayandırıldı.`);
                    return;
                }
                await etibarliMesajGonder(sock, chatId, `🚪 @${cleanSender} oyundan ayrıldı.`, [senderId], msg);
                return;
            }

            // --- 5. AKTİV İSTİFADƏÇİLƏR ---
            if (activeCmd === 'user') {
                if (!oyunlar[chatId]) {
                    await etibarliMesajGonder(sock, chatId, '❌ Hazırda aktiv oyun yoxdur.', [], msg);
                    return;
                }
                const list = Array.from(oyunlar[chatId].oyuncular);
                let tekst = `👥 *Aktiv Oyunçular (${list.length} nəfər):*\n\n`;
                list.forEach((id, idx) => { tekst += `${idx + 1}. @${id.split('@')[0]}\n`; });
                await etibarliMesajGonder(sock, chatId, tekst, list, msg);
                return;
            }

            // --- 6. DAYANDIRMAQ ---
            if (activeCmd === 'stop') {
                if (oyunlar[chatId]) {
                    oyunuMexanikiDayandir(chatId);
                    await etibarliMesajGonder(sock, chatId, '🛑 Oyun dayandırıldı və taymerlər sıfırlandı.', [], msg);
                } else {
                    await etibarliMesajGonder(sock, chatId, 'Hazırda dayandırılacaq aktiv oyun yoxdur.', [], msg);
                }
                return;
            }

            // --- 7. XAL VƏ REYTİNQ ---
            if (activeCmd === 'xal') {
                let userDoc = await usersCollection.findOne({ userId: senderId });
                await etibarliMesajGonder(sock, chatId, `📊 Sizin cari xalınız: *${userDoc ? userDoc.xal : 0}*`, [], msg);
                return;
            }

            if (activeCmd === 'top') {
                const topUsers = await usersCollection.find().sort({ xal: -1 }).limit(15).toArray();
                if (topUsers.length === 0) {
                    await etibarliMesajGonder(sock, chatId, '📉 Siyahı boşdur.', [], msg);
                    return;
                }
                let reytinq = `🏆 *TOP 15 LİDERLƏR REYTİNQİ* 🏆\n\n`;
                topUsers.forEach((u, i) => { reytinq += `${i + 1}. @${u.userId.split('@')[0]} ➔ *${u.xal} xal*\n`; });
                await etibarliMesajGonder(sock, chatId, reytinq, topUsers.map(u => u.userId), msg);
                return;
            }

            // --- 8. İPUCU ---
            if (activeCmd === 'ipucu') {
                const sessiya = oyunlar[chatId];
                if (!sessiya) return;
                if (!sessiya.oyuncular.has(senderId)) {
                    await etibarliMesajGonder(sock, chatId, '⚠️ Əvvəlcə oyuna qoşulmalısınız! (`.join`)', [], msg);
                    return;
                }

                if (!sessiya.ipucuLimitleri[senderId]) sessiya.ipucuLimitleri[senderId] = 0;
                if (sessiya.ipucuLimitleri[senderId] >= 4) {
                    await etibarliMesajGonder(sock, chatId, '⚠️ İpucu limitiniz bitib (Maksimum 4).', [], msg);
                    return;
                }

                let userDoc = await usersCollection.findOne({ userId: senderId });
                let currentXal = userDoc ? userDoc.xal : 0;
                if (currentXal < 5) {
                    await etibarliMesajGonder(sock, chatId, `❌ Balansda kifayət qədər xal yoxdur (Xalınız: ${currentXal}).`, [], msg);
                    return;
                }

                await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: -5 } });
                sessiya.ipucuLimitleri[senderId] += 1;

                const cariSoz = sessiya.sozler[sessiya.sozIndex];
                await etibarliMesajGonder(sock, chatId, `💡 *İPUCU VERİLDİ* \n👤 @${cleanSender} (-5 Xal)\n📌 İpucu: _${cariSoz.ipucu}_\n🔍 Söz: *${cariSoz.şablon}*`, [senderId], msg);
                return;
            }

            // --- 9. CAVAB MEXANİZMİ (Nöqtəsiz gələn mesajları qəbul etmək üçün) ---
            // Əgər activeCmd boşdursa, deməli bu sadəcə nöqtəsiz yazılmış bir mətndir və cavab ola bilər.
            if (oyunlar[chatId] && oyunlar[chatId].aktiv && !activeCmd) {
                const sessiya = oyunlar[chatId];
                if (!sessiya.oyuncular.has(senderId)) return;
                
                const clearedText = textContent.toLowerCase();
                if (clearedText.includes(" ")) return; // Boşluq varsa söz deyil

                const cariSoz = sessiya.sozler[sessiya.sozIndex];

                if (clearedText === cariSoz.cavab.toLowerCase()) {
                    if (sessiya.sozTaymeri) clearTimeout(sessiya.sozTaymeri);
                    sessiya.dogruCavabTapildi = true;

                    await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: 10 } }, { upsert: true });
                    let updatedDoc = await usersCollection.findOne({ userId: senderId });

                    await etibarliMesajGonder(sock, chatId, `✅ *Doğru Cavab! @${cleanSender} (+10 Xal)*\n📊 Ümumi Balansınız: *${updatedDoc.xal} xal*`, [senderId], msg);
                    novbetiSozeKec(sock, chatId);
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
