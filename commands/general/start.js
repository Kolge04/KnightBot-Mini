// commands/general/start.js

const config = require('../../config'); // config faylına gedən yol (qovluq sayına görə tənzimlə)

module.exports = {
  name: 'start',
  aliases: ['basla'],
  category: 'general',
  description: 'Botun əsas xoş gəldin panelini və menyusunu göstərər',
  usage: '.start',

  async execute(sock, msg, args, extra) {
    try {
      const from = extra.from;
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderNumber = senderJid.split('@')[0];
      const senderTag = `@${senderNumber}`;

      // Botun aktivlik (uptime) vaxtını hesablamaq üçün təmiz format
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeString = `${hours}s ${minutes}d ${seconds}s`;

      // 💻 İstifadəçi paneli tərtibatı
      let startText = `✨ *Salam, ${senderTag}!* 👋\n\n`;
      startText += `🤖 *Mən:* ${config.botName}\n`;
        startText += `👑 *Rəhbər:* ${config.ownerName}\n`;
      startText += `⚡ *Prefix:* \` ${config.prefix} \` \n`;
      startText += `⏳ *Aktivlik Vaxtı:* \`${uptimeString}\`\n`;
      startText += `📊 *Sistem Modu:* ${config.selfMode ? '🔒 _Self (Özəl)_' : '🔓 _Public (Açıq)_'}\n\n`;

      startText += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n\n`;
      startText += `📜 *Əsas Komandalar:* \n`;
      startText += `🔹 \`${config.prefix}menu\` - Bütün komandaların siyahısı\n`;
      startText += `🔹 \`${config.prefix}alive\` - Botun işlək olub olmadığını yoxla\n`;
      startText += `🔹 \`${config.prefix}game\` - Oyun meynusunu aç`;
      
      
      startText += `\n\n> 💡 Ətrafl məlumat üçün;  `.menu` yaza bilərsiniz.`;

      // Əgər qrupdursa, qrup adını da mesaja gözəl şəkildə əlavə edək
      if (extra.isGroup && extra.groupMetadata) {
        startText = `🏛️ *Qrup:* _${extra.groupMetadata.subject}_\n` + startText;
      }

      // Reaksiya bildirmək (⏳ və ya ✨)
      await extra.react('✨');

      // Mesajı göndəririk
      await sock.sendMessage(from, {
        text: startText,
        mentions: [senderJid]
      }, { quoted: msg });

    } catch (error) {
      console.error('Start Command Error:', error);
      await extra.reply("⚠️ *Start mesajı göndərilərkən xəta baş verdi!*");
    }
  }
};
