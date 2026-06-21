/**
 * Group Info Command - Display group information
 */

module.exports = {
    name: 'ginfo',
    aliases: ['info', 'ginfo'],
    category: 'general',
    description: 'Qrup məlumatlarını göstərin',
    usage: '.ginfo',
    groupOnly: true,
    
    async execute(sock, msg, args, extra) {
      try {
        const metadata = extra.groupMetadata;
        
        const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const members = metadata.participants.filter(p => !p.admin);
        
        let text = `📋 *QRUP MƏLUMATLARı*\n\n`;
        text += `🏷️ AD: ${metadata.subject}\n`;
        text += `🆔 ID: ${metadata.id}\n`;
        text += `👥 ÜZVLƏR: ${metadata.participants.length}\n`;
        text += `👑 ADMIN SAYı: ${admins.length}\n`;
        text += `📝 TƏSVIR: ${metadata.desc || 'No description'}\n`;
        text += `🔒 MƏHTUTLAŞDıRıLıB: ${metadata.restrict ? 'Yes' : 'No'}\n`;
        text += `📢 ELAN ET: ${metadata.announce ? 'Yes' : 'No'}\n`;
        text += `📅 TARIX: ${new Date(metadata.creation * 1000).toLocaleDateString()}\n\n`;
        text += `👑 *ADMINLƏR:*\n`;
        
        admins.forEach((admin, index) => {
          text += `${index + 1}. @${admin.id.split('@')[0]}\n`;
        });
        
        await sock.sendMessage(extra.from, {
          text,
          mentions: admins.map(a => a.id)
        }, { quoted: msg });
        
      } catch (error) {
        await extra.reply(`❌ XƏTA: ${error.message}`);
      }
    }
  };
  
