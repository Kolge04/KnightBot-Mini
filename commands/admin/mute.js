/**
 * Mute Command - Close group (only admins can send)
 */

module.exports = {
    name: 'lock',
    aliases: ['close', 'closegroup'],
    category: 'admin',
    description: 'Close group (only admins can send messages)',
    usage: '.mute',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
      try {
        await sock.groupSettingUpdate(extra.from, 'announcement');
        await extra.reply('🔒 Qrup bağlıdır! \n\nArtıq yalnız administratorlar mesaj göndərə bilər.');
        
      } catch (error) {
        await extra.reply(`❌ Xəta: ${error.message}`);
      }
    }
  };
  
