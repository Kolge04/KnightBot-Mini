// commands/group/pin.js

module.exports = {
  name: 'pin',
  aliases: ['berkit', 'sabitle', 'unpin'],
  category: 'fun',
  description: 'Qrupda mesajı bərkidər və ya sabitdən çıxarar',
  usage: '.pin [mətn / reply] və ya .unpin [reply]',
  groupOnly: true,       // Yalnız qruplarda işləsin
  botAdminNeeded: true,  // Bot mütləq admin olmalıdır

  async execute(sock, msg, args, extra) {
    try {
      const from = extra.from;
      const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();

      // 1. Gələn əmrin .unpin yoxsa .pin olduğunu yoxlayırıq
      const isUnpinAction = body.startsWith(`${extra.prefix}unpin`) || extra.commandName === 'unpin';

      // ==========================================
      // 🚫 SABİTDƏN ÇIXARMA (.unpin) MƏNTİQİ
      // ==========================================
      if (isUnpinAction) {
        let targetKey = null;

        // Əgər spesifik bir mesaja reply edib .unpin yazıbsa:
        if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
          targetKey = {
            remoteJid: from,
            fromMe: msg.message.extendedTextMessage.contextInfo.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
            participant: msg.message.extendedTextMessage.contextInfo.participant
          };
        }

        // WhatsApp-da mesajı sabitdən çıxarmaq üçün type: 2 (unpin) göndərilir
        await sock.sendMessage(from, {
          pin: {
            key: targetKey, // Əgər targetKey nulldursa, WhatsApp avtomatik sonuncu bərkidilmiş mesajı sabitdən çıxarır
            type: 2, 
            time: 0
          }
        });

        return extra.reply(targetKey ? "🔓 *Seçilmiş mesaj sabitdən çıxarıldı!*" : "🔓 *Sonuncu bərkidilmiş mesaj sabitdən çıxarıldı!*");
      }

      // ==========================================
      // 📌 MESAJ BƏRKİTMƏ (.pin) MƏNTİQİ
      // ==========================================
      let messageToPinKey = null;

      // Variant A: Əgər kiminsə mesajına cavab (reply) verərək .pin yazıbsa
      if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
        messageToPinKey = {
          remoteJid: from,
          fromMe: msg.message.extendedTextMessage.contextInfo.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
          id: msg.message.extendedTextMessage.contextInfo.stanzaId,
          participant: msg.message.extendedTextMessage.contextInfo.participant
        };
      } 
      // Variant B: Əgər reply etməyib, birbaşa `.pin hər hansı mətn` yazıbsa
      else if (args.length > 0) {
        const pinText = args.join(' ');
        // Əvvəlcə bot həmin mətni qrupa mesaj olaraq göndərir
        const sent = await sock.sendMessage(from, { text: pinText }, { quoted: msg });
        messageToPinKey = sent.key || sent[0]?.key;
      } 
      // Əgər heç biri yoxdursa istifadəçini xəbərdar et
      else {
        return extra.reply("❌ *Zəhmət olmasa bir mesaja reply edin və ya bərkitmək üçün mətn yazın!* (Məsələn: `.pin Diqqət elan!`)");
      }

      // WhatsApp-da mesajı bərkitmək üçün type: 1 (pin) və saniyə göndərilir (Biz 30 günlük bərkidirik)
      await sock.sendMessage(from, {
        pin: {
          key: messageToPinKey,
          type: 1,
          time: 2592000 // 30 gün (saniyə ilə)
        }
      });

      await extra.reply("📌 *Mesaj uğurla qrupun yuxarı hissəsinə bərkidildi!*");

    } catch (error) {
      console.error('Pin/Unpin Command Error:', error);
      await extra.reply("⚠️ *Mesajı bərkidərkən xəta baş verdi. Botun admin olduğundan əmin olun!*");
    }
  }
};
