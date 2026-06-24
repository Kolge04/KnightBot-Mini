/**
 * QR Code Generator Command
 */

const qrcode = require('qrcode');

module.exports = {
  name: 'qr',
  aliases: ['qrcode'],
  category: 'general',
  description: 'Mətndən QR kodu yaradın',
  usage: '.qr <text>',
  
  async execute(sock, msg, args, extra) {
    try {
      if (args.length === 0) {
        return extra.reply('❌ İstifadə: .qr <text>\n\nMəsələn: .qr https://google.com');
      }
      
      const text = args.join(' ');
      
      const qrBuffer = await qrcode.toBuffer(text, {
        type: 'png',
        width: 500,
        margin: 2
      });
      
      await sock.sendMessage(extra.from, {
        image: qrBuffer,
        caption: `✅ QR kod yaradıldı!\n\n📝 Mətn: ${text}`
      }, { quoted: msg });
      
    } catch (error) {
      await extra.reply(`❌ Xəta: ${error.message}`);
    }
  }
};
