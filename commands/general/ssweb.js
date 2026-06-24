/**
 * SSWeb - Screenshot Website Command
 */

const APIs = require('../../utils/api');

module.exports = {
  name: 'ssweb',
  aliases: ['screenshot', 'ss', 'webss'],
  category: 'general',
  description: 'Take a screenshot of a website',
  usage: '.ssweb <url>',
  
  async execute(sock, msg, args, extra) {
    try {
      if (args.length === 0) {
        return extra.reply('❌ Lütfən, vebsayt URL-ni təqdim edin!\n\nMəsələn: .ssweb https://github.com');
      }
      
      const url = args.join(' ');
      
      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return extra.reply('❌ Lütfən, http:// və ya https:// ilə başlayan etibarlı URL təqdim edin');
      }
      
      await sock.sendMessage(extra.from, {
        react: { text: '📥', key: msg.key }
      });
      
      const screenshotBuffer = await APIs.screenshotWebsite(url);
      
      await sock.sendMessage(extra.from, {
        image: screenshotBuffer,
      }, { quoted: msg });
      
    } catch (error) {
      console.error('SSWeb command error:', error);
      await extra.reply(`❌ Veb saytın ekran görüntüsünü çəkmək alınmadı: ${error.message}`);
    }
  }
};

