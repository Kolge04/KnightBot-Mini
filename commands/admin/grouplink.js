/**
 * Group Link Command - Get group invite link
 */

module.exports = {
    name: 'Link',
    aliases: ['glink', 'invite'],
    category: 'admin',
    description: 'Get group invite link',
    usage: '.grouplink',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
      try {
        const code = await sock.groupInviteCode(extra.from);
        const link = `https://chat.whatsapp.com/${code}`;
        
        let text = `🔗 *QRUP DƏVƏT LİNKİ*\n\n`;
        text += `📱 Qrup: ${extra.groupMetadata.subject}\n`;
        text += `🔗 Link: ${link}\n\n`;
        text += `⚠️ Bu linki açıq şəkildə paylaşmayın!`;
        
        await extra.reply(text);
        
      } catch (error) {
        await extra.reply(`❌ Xəta: ${error.message}`);
      }
    }
  };
  
