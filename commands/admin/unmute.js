/**
 * Unmute Command - Open group (all members can send)
 */

module.exports = {
    name: 'unlock',
    aliases: ['open', 'opengroup'],
    category: 'admin',
    description: 'Open group (all members can send messages)',
    usage: '.unlock',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
      try {
        await sock.groupSettingUpdate(extra.from, 'not_announcement');
        await extra.reply('🔓 Qrup açıldı!\n\nBütün üzvlər indi mesaj göndərə bilər.');
        
      } catch (error) {
        await extra.reply(`❌ Xəta: ${error.message}`);
      }
    }
  };
  
