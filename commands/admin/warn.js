/**
 * Warn Command - Warn a user
 */

const database = require('../../database');
const config = require('../../config');

module.exports = {
  name: 'warn',
  aliases: ['warning'],
  category: 'admin',
  description: 'Warn a user',
  usage: '.warn @user <reason>',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  async execute(sock, msg, args, extra) {
    try {
      let target;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = ctx?.mentionedJid || [];
      
      if (mentioned && mentioned.length > 0) {
        target = mentioned[0];
      } else if (ctx?.participant && ctx.stanzaId && ctx.quotedMessage) {
        target = ctx.participant;
      } else {
        return extra.reply('❌ Xəbərdarlıq etmək üçün istifadəçini qeyd edin və ya ona cavab yazın!\n\nMəsələn: .warn @user Qaydaları pozur');
      }
      
      const reason = args.slice(mentioned.length > 0 ? 1 : 0).join(' ') || 'Səbəb göstərilməyib';
      
      // Cannot warn admins
      const foundParticipant = extra.groupMetadata.participants.find(
        p => (p.id === target || p.lid === target) && (p.admin === 'admin' || p.admin === 'superadmin')
      );
      
      if (foundParticipant) {
        return extra.reply('❌ Admini xəbərdar etmək mümkün deyil!');
      }
      
      const warnings = database.addWarning(extra.from, target, reason);
      
      let text = `⚠️ *İSTİFADƏÇİ XƏBƏRDARLIĞI*\n\n`;
      text += `👤 İsdifadəçi: @${target.split('@')[0]}\n`;
      text += `📝 Səbəb: ${reason}\n`;
      text += `⚠️ Xəbərdarlıqlar: ${warnings.count}/${config.maxWarnings}\n\n`;
      
      if (warnings.count >= config.maxWarnings) {
        text += `❌ İstifadəçi maksimum xəbərdarlıqlara çatdı və silinəcək!`;
        
        await sock.sendMessage(extra.from, {
          text,
          mentions: [target]
        }, { quoted: msg });
        
        if (extra.isBotAdmin) {
          await sock.groupParticipantsUpdate(extra.from, [target], 'remove');
          database.clearWarnings(extra.from, target);
        }
      } else {
        text += `⚠️ Növbəti xəbərdarlıq silinmə ilə nəticələnəcək!`;
        
        await sock.sendMessage(extra.from, {
          text,
          mentions: [target]
        }, { quoted: msg });
      }
      
    } catch (error) {
      await extra.reply(`❌ Xəta: ${error.message}`);
    }
  }
};
