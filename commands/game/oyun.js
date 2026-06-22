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
    aliases: ['gm', 'oyun', 'join', 'unjoin', 'stop', 'top', 'xal', 'ipucu', 'user', 'clear', 'reset', 'game_internal_answer'],
    category: 'game',
    description: 'Nöqtəli və Nöqtəsiz cavab dəstəkli, sıfırlama sistemli söz oyunu',
    usage: '.oyun, .join, .stop, .top, .xal, .ipucu, .clear, .reset',
    oyunlar, // handler.js-in oxuya bilməsi üçün çölə çıxarırıq

    async execute(sock, msg, args, options) {
        try {
            if (!msg) return;
            
            const chatId = options?.from || msg.key?.remoteJid;
            const senderId = options?.sender || msg.key?.participant || msg.key?.remoteJid;
            if (!chatId || !senderId) return;

            const cleanSender = senderId.split('@')[0].split(':')[0];

            let textContent = '';
            if (msg.body) textContent = msg.body;
            else if (msg.message) textContent = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            textContent = textContent.trim();

            // Əmri təyin edirik (Bu daxili nöqtəsiz cavabdır yoxsa normal əmr)
            let activeCmd = '';
            if (textContent.startsWith(config.prefix)) {
                activeCmd = textContent.slice(config.prefix.length).trim().split(/\s+/)[0].toLowerCase();
            } else if (options && options.reply) {
                // Əgər handler.js bunu xüsusi daxili adla yönləndiribsə
                if (msg.body === undefined && textContent) activeCmd = 'game_internal_answer';
            }
            
            // Framework-ün bəzi versiyalarında daxili ad birbaşa commandName kimi gələ bilər
            if (args && args._commandName === 'game_internal_answer') activeCmd = 'game_internal_answer';

            if (!usersCollection) return;

            // ==========================================
            // 🛠️ YENİ ƏMRLƏR: CLEAR VƏ RESET
            // ==========================================
            
            // --- CLEAR: Bütün bazadakı istifadəçilərin xallarını 0 edir ---
            if (activeCmd === 'clear') {
                await usersCollection.updateMany({}, { $set: { xal: 0 } });
                await etibarliMesajGonder(sock, chatId, '♻️ Verilənlər bazasındakı bütün istifadəçilərin xalları sıfırlandı!', [], msg);
                return;
            }

            // --- RESET: Reply, @etiket və ya nömrə ilə xal sıfırlayır ---
            if (activeCmd === 'reset') {
                let targetUser = null;

                // 1. Üsul: Mesaj cavablanıbsa (Reply)
                const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
                if (quotedParticipant) {
                    targetUser = quotedParticipant;
                }

                // 2. Üsul: @etiket edilibsə (Mention)
                if (!targetUser) {
                    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
                    if (mentions && mentions.length > 0) {
                        targetUser = mentions[0];
                    }
                }

                // 3. Üsul: Birbaşa nömrə yazılıbsa (.reset 99450xxxxxxx)
                if (!targetUser) {
                    const temizNomre = textContent.split(' ')[1]?.replace(/[^0-9]/g, '');
                    if (temizNomre) {
                        targetUser = `${temizNomre}@s.whatsapp.net`;
                    }
                }

                if (targetUser) {
                    await usersCollection.updateOne({ userId: targetUser }, { $set: { xal: 0 } }, { upsert: true });
                    const t_clean = targetUser.split('@')[0];
                    await etibarliMesajGonder(sock, chatId, `🧹 @${t_clean} istifadəçisinin xalı sıfırlandı.`, [targetUser], msg);
                } else {
                    await etibarliMesajGonder(sock, chatId, '⚠️ *İstifadə qaydası:*\n1. Mesajı cavablayaraq `.reset` yazın.\n2. `.reset @istifadeci` şəklində etiketləyin.\n3. `.reset 99477xxxxxxx` nömrə ilə yazın.', [], msg);
                }
                return;
            }

            // ==========================================
            // 🎮 OYUN MEXANİZMİ VƏ IDARƏETMƏ
            // ==========================================

            // --- MENYU ---
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
                `📝 *Qeyd:* Cavabları yazarkən artıq başına nöqtə qoymağa ehtiyac yoxdur! Birbaşa yazın (Məs: Alma).`;
                
                await etibarliMesajGonder(sock, chatId, menuTxt, [], msg);
                return;
            }

            // --- OYUNU BAŞLATMAQ ---
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

            // --- OYUNA QOŞULMAQ ---
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

            // --- OYUNDAN AYRILMAQ ---
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

            // --- İSTİFADƏÇİLƏR ---
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

            // --- DAYANDIRMAQ ---
            if (activeCmd === 'stop') {
                if (oyunlar[chatId]) {
                    oyunuMexanikiDayandir(chatId);
                    await etibarliMesajGonder(sock, chatId, '🛑 Oyun dayandırıldı və taymerlər sıfırlandı.', [], msg);
                } else {
                    await etibarliMesajGonder(sock, chatId, 'Hazırda dayandırılacaq aktiv oyun yoxdur.', [], msg);
                }
                return;
            }

            // --- XAL VƏ REYTİNQ ---
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

            // --- İPUCU ---
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

            // ==========================================
            // 🎯 NÖQTƏSİZ CAVAB MEXANİZMİ
            // ==========================================
            if (oyunlar[chatId] && oyunlar[chatId].aktiv) {
                const sessiya = oyunlar[chatId];
                if (!sessiya.oyuncular.has(senderId)) return;
                
                const clearedText = textContent.trim().toLowerCase();
                const cariSoz = sessiya.sozler[sessiya.sozIndex];

                // Əgər gələn mesaj tam olaraq düzgün cavaba bərabərdirsə
                if (clearedText === cariSoz.cavab.toLowerCase()) {
                    if (sessiya.sozTaymeri) clearTimeout(sessiya.sozTaymeri);
                    sessiya.dogruCavabTapildi = true;

                    await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: 10 } }, { upsert: true });
                    let updatedDoc = await usersCollection.findOne({ userId: senderId });

                    await etibarliMesajGonder(sock, chatId, `✅ *Doğru Cavab! @${cleanSender} (+10 Xal)*\n📊 Ümumi Balansınız: *${updatedDoc.xal} xal*`, [senderId], msg);
                    novbetiSozeKec(sock, chatId);
                } else {
                    // Səhv cavab yazılıbsa və bu hər hansı başqa bir əmr `.oyun`, `.stop` deyil saniyədə -5 xal çıxılır
                    if (!textContent.startsWith(config.prefix)) {
                        let userDoc = await usersCollection.findOne({ userId: senderId });
                        let currentXal = userDoc ? userDoc.xal : 0;
                        if (currentXal > 0) {
                            await usersCollection.updateOne({ userId: senderId }, { $inc: { xal: -5 } });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Oyun Modulu İcra Xətası:', error);
        }
    }
};
