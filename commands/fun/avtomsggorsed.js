// =========================================================================
// 🕵️‍♂️ AVTOMATİK SİLİNƏN MEDİALARI (ŞƏKİL, SƏS, STİKER) VƏ MƏTNİ BƏRPA ETMƏK
// Bu bloku handler.js-dəki initializeAntiCall funksiyasından ƏVVƏL əlavə et
// və module.exports-a handleAvtoBerpa funksiyasını da qoş.
// =========================================================================

const handleAvtoBerpa = (sock, store) => {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const database = require('./database');

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const isDeleted =
        update.update.message === null ||
        update.update.clearMediaKey ||
        update.update.message?.protocolMessage?.type === 0 ||
        update.update.message?.protocolMessage?.type === 'REVOKE';

      if (!isDeleted) continue;

      try {
        const from = update.key.remoteJid;

        // Yalnız qruplar + broadcast/status/newsletter istisna
        if (
          !from ||
          !from.endsWith('@g.us') ||
          from.includes('@broadcast') ||
          from.includes('status.broadcast') ||
          from.includes('@newsletter')
        ) continue;

        // Bu qrup üçün avtoberpa aktiv deyilsə keç
        const groupSettings = database.getGroupSettings(from);
        if (!groupSettings.avtoberpa) continue;

        const senderId = update.key.participant || update.key.remoteJid;
        const cleanSender = senderId.split('@')[0].split(':')[0];

        // Botun özü tərəfindən silinənlər göstərilməsin
        if (senderId.includes(sock.user.id.split(':')[0])) continue;

        const originalMsg = await store.loadMessage(from, update.key.id);
        if (!originalMsg || !originalMsg.message) continue;

        const msgContent =
          originalMsg.message.ephemeralMessage?.message || originalMsg.message;

        const timestamp = originalMsg.messageTimestamp;
        const vaxt = timestamp
          ? new Date(timestamp * 1000).toLocaleTimeString('az-AZ', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Bilinmir';

        let bildirisMetni =
          `🕵️‍♂️ *BİR MESAJ SİLİNDİ (AVTO)!* 🕵️‍♂️\n\n` +
          `👤 *Göndərən:* @${cleanSender}\n` +
          `🕒 *Yazılma vaxtı:* ${vaxt}\n`;

        // Media mesajı (şəkil, video, stiker, səs)
        const hasMedia =
          msgContent.imageMessage ||
          msgContent.videoMessage ||
          msgContent.stickerMessage ||
          msgContent.audioMessage ||
          msgContent.viewOnceMessage?.message?.imageMessage ||
          msgContent.viewOnceMessageV2?.message?.imageMessage ||
          msgContent.viewOnceMessage?.message?.videoMessage ||
          msgContent.viewOnceMessageV2?.message?.videoMessage;

        if (hasMedia) {
          const caption =
            msgContent.imageMessage?.caption ||
            msgContent.videoMessage?.caption ||
            '';
          bildirisMetni += `💬 *Silinən Media İfşası!*${
            caption ? `\n📝 *Alt yazı:* _${caption}_` : ''
          }`;

          const buffer = await downloadMediaMessage(
            originalMsg,
            'buffer',
            {},
            {
              logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {}, child: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, trace: () => {} }) },
              reuploadRequest: sock.updateMediaMessage,
            }
          );

          if (buffer) {
            if (
              msgContent.imageMessage ||
              msgContent.viewOnceMessage?.message?.imageMessage ||
              msgContent.viewOnceMessageV2?.message?.imageMessage
            ) {
              await sock.sendMessage(from, {
                image: buffer,
                caption: bildirisMetni,
                mentions: [senderId],
              });
            } else if (
              msgContent.videoMessage ||
              msgContent.viewOnceMessage?.message?.videoMessage ||
              msgContent.viewOnceMessageV2?.message?.videoMessage
            ) {
              await sock.sendMessage(from, {
                video: buffer,
                caption: bildirisMetni,
                mentions: [senderId],
              });
            } else if (msgContent.stickerMessage) {
              await sock.sendMessage(from, {
                text: bildirisMetni + `💬 *Növü:* ✨ Stiker`,
                mentions: [senderId],
              });
              await sock.sendMessage(from, { sticker: buffer });
            } else if (msgContent.audioMessage) {
              await sock.sendMessage(from, {
                text: bildirisMetni + `💬 *Növü:* 🎵 Səs Yazısı`,
                mentions: [senderId],
              });
              await sock.sendMessage(from, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: msgContent.audioMessage.ptt,
              });
            }
            continue;
          }
        }

        // Mətn və ya fayl silinibsə
        let oldText =
          msgContent.conversation || msgContent.extendedTextMessage?.text;
        if (!oldText && msgContent.documentMessage) {
          oldText = `📁 Sənəd/Fayl (Adı: ${
            msgContent.documentMessage.fileName || 'Bilinmir'
          })`;
        }

        if (oldText) {
          bildirisMetni += `💬 *Silinən mətn:* \n\n> _${oldText}_`;
          await sock.sendMessage(
            from,
            { text: bildirisMetni, mentions: [senderId] },
            { quoted: originalMsg }
          );
        }
      } catch (err) {
        // Xətaları idarə et
      }
    }
  });
};
