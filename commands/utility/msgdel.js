// =========================================================================
  // 🕵️‍♂️ AVTOMATİK SİLİNƏN MEDİALARI (ŞƏKİL, SƏS, STİKER) VƏ MƏTNİ BƏRPA ETMƏK
  // =========================================================================
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const isDeleted = update.update.message === null || 
                        update.update.clearMediaKey || 
                        update.update.message?.protocolMessage?.type === 0 ||
                        update.update.message?.protocolMessage?.type === 'REVOKE';

      if (isDeleted) {
        try {
          const from = update.key.remoteJid;
          if (!from || from.includes('@broadcast') || from.includes('status.broadcast') || from.includes('@newsletter')) continue;

          const senderId = update.key.participant || update.key.remoteJid;
          const cleanSender = senderId.split('@')[0].split(':')[0];

          if (senderId.includes(sock.user.id.split(':')[0])) continue;

          const originalMsg = await store.loadMessage(from, update.key.id);

          if (originalMsg && originalMsg.message) {
            const msgContent = originalMsg.message.ephemeralMessage?.message || originalMsg.message;
            
            const timestamp = originalMsg.messageTimestamp;
            const vaxt = timestamp ? new Date(timestamp * 1000).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) : "Bilinmir";

            let bildirisMetni = `🕵️‍♂️ *BİR MESAJ SİLİNDİ (AVTO)!* 🕵️‍♂️\n\n` +
                                `👤 *Göndərən:* @${cleanSender}\n` +
                                `🕒 *Yazılma vaxtı:* ${vaxt}\n`;

            // ŞƏKİL, VİDEO və ya BİR DƏFƏLİK media silinib qaçırılarsa:
            if (msgContent.imageMessage || msgContent.videoMessage || msgContent.stickerMessage || msgContent.audioMessage ||
                msgContent.viewOnceMessage?.message?.imageMessage || msgContent.viewOnceMessageV2?.message?.imageMessage ||
                msgContent.viewOnceMessage?.message?.videoMessage || msgContent.viewOnceMessageV2?.message?.videoMessage) {
              
              // Başlığı (caption) çıxarırıq
              const caption = msgContent.imageMessage?.caption || msgContent.videoMessage?.caption || "";
              bildirisMetni += `💬 *Silinən Media İfşası!* ${caption ? `\n📝 *Alt yazı:* _${caption}_` : ''}`;

              // Medianın özünü WhatsApp serverlərindən dərhal endiririk (keş bitməyibsə)
              const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, { 
                logger: suppressedLogger,
                reuploadRequest: sock.updateMediaMessage
              });

              if (buffer) {
                if (msgContent.imageMessage || msgContent.viewOnceMessage?.message?.imageMessage || msgContent.viewOnceMessageV2?.message?.imageMessage) {
                  await sock.sendMessage(from, { image: buffer, caption: bildirisMetni, mentions: [senderId] });
                } else if (msgContent.videoMessage || msgContent.viewOnceMessage?.message?.videoMessage || msgContent.viewOnceMessageV2?.message?.videoMessage) {
                  await sock.sendMessage(from, { video: buffer, caption: bildirisMetni, mentions: [senderId] });
                } else if (msgContent.stickerMessage) {
                  // Əvvəlcə bildiriş mətnini göndərir, dərhal ardınca stikerin özünü atır
                  await sock.sendMessage(from, { text: bildirisMetni + `💬 *Növü:* ✨ Stiker`, mentions: [senderId] });
                  await sock.sendMessage(from, { sticker: buffer });
                } else if (msgContent.audioMessage) {
                  await sock.sendMessage(from, { text: bildirisMetni + `💬 *Növü:* 🎵 Səs Yazısı`, mentions: [senderId] });
                  await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mp4', ptt: msgContent.audioMessage.ptt });
                }
                continue; // Medianı göndərdiksə aşağıdakı düz mətn blokuna keçməsin
              }
            }

            // Normal düz mətn mesajı silinibsə:
            let oldText = msgContent.conversation || msgContent.extendedTextMessage?.text;
            if (!oldText && msgContent.documentMessage) {
              oldText = `📁 Sənəd/Fayl (Adı: ${msgContent.documentMessage.fileName || 'Bilinmir'})`;
            }

            if (oldText) {
              bildirisMetni += `💬 *Silinən mətn:* \n\n> _${oldText}_`;
              await sock.sendMessage(from, {
                text: bildirisMetni,
                mentions: [senderId]
              }, { quoted: originalMsg });
            }
          }
        } catch (err) {
          // Xətaları idarə et
        }
      }
    }
  });
