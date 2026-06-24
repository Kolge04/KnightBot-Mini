// =========================================================================
// 🕵️‍♂️ HƏM QRUPDA, HƏM ÖZƏLDƏ AVTOMATİK SİLİNƏN MESAJLARI TUTMA MEXANİZMİ
// =========================================================================
sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
        // Əgər mesaj hər kəs üçün silinibsə (protocolMessage və ya message === null)
        if (update.update.clearMediaKey || update.update.message === null || (update.update.message?.protocolMessage && update.update.message.protocolMessage.type === 0)) {
            try {
                const chatId = update.key.remoteJid;
                const isGroup = chatId.endsWith('@g.us');
                
                // Mesajı silən şəxsin ID-si (Qrupda participant olur, özəldə elə çatın özü)
                const senderId = update.key.participant || update.key.remoteJid;
                const cleanSender = senderId.split('@')[0].split(':')[0];

                // Botun öz sildiyi mesajları görməzdən gəlsin
                if (senderId.includes(sock.user.id.split(':')[0])) continue;

                // Baileys 'store' vasitəsilə silinən mesajın köhnə variantını RAM-dan tapırıq
                // Qeyd: index.js faylında 'store.bind(sock.ev)' kodunun yazıldığından əmin ol!
                if (!store || !store.messages || !store.messages[chatId]) continue;
                
                const chatMessages = store.messages[chatId].array;
                const originalMsg = chatMessages.find(m => m.key.id === update.key.id);

                // Əgər silinən mesaj bot aktiv olandan sonra gəlibsə və keşdə tapılıbsa
                if (originalMsg && originalMsg.message) {
                    
                    // Fərqli mesaj növlərinə görə mətni çıxarırıq
                    const oldText = originalMsg.message.conversation || 
                                    originalMsg.message.extendedTextMessage?.text || 
                                    (originalMsg.message.imageMessage ? '[📸 Şəkil Mesajı]' : null) || 
                                    (originalMsg.message.videoMessage ? '[🎥 Video Mesajı]' : null) || 
                                    (originalMsg.message.stickerMessage ? '[✨ Stiker]' : null) ||
                                    (originalMsg.message.audioMessage ? '[🎵 Səs Yazısı]' : null) ||
                                    '📝 Mətn olmayan mesaj (Media və ya Sənəd)';

                    // Mesajın yazılma vaxtını hesablayırıq
                    const timestamp = originalMsg.messageTimestamp;
                    const vaxt = timestamp ? new Date(timestamp * 1000).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) : "Bilinmir";

                    // Bildiriş mətnini hazırlayırıq
                    let bildirisMetni = `🕵️‍♂️ *BİR MESAJ SİLİNDİ (AVTO)!* 🕵️‍♂️\n\n` +
                                        `👤 *Göndərən:* @${cleanSender}\n` +
                                        `🕒 *Yazılma vaxtı:* ${vaxt}\n` +
                                        `💬 *Silinən mətn/media:* \n\n> _${oldText}_`;

                    // Mesajı qrupa və ya şəxsi çata avtomatik göndəririk
                    await sock.sendMessage(chatId, {
                        text: bildirisMetni,
                        mentions: [senderId]
                    }, { quoted: originalMsg }); // Silinən orijinal mesajı sitat (quote) gətirir
                }

            } catch (err) {
                console.error("Avtomatik silinən mesaj işlənərkən xəta:", err);
            }
        }
    }
});
