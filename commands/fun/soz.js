// commands/soz.js
const sozlerBazasi = require('../../word'); 

module.exports = {
  name: 'soz',
  aliases: ['söz', 'word', 'randomsoz'],
  category: 'fun',
  description: 'Sözlər bazasından təsadüfi (random) bir söz göndərir',
  usage: '.soz',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      if (!sozlerBazasi || sozlerBazasi.length === 0) {
        return sock.sendMessage(chatId, { text: '❌ Sözlər bazası boşdur və ya tapılmadı.' }, { quoted: msg });
      }

      const randomIndex = Math.floor(Math.random() * sozlerBazasi.length);
      const secilenSoz = sozlerBazasi[randomIndex];
      // Mesajı WhatsApp-ın başa düşəcəyi təmiz formata salırıq (Markdown mötərizələrini təmizlədik)
      let mesajMetni = `📝 *GÜNÜN SÖZÜ:* \n\n` +
                        `> _${secilenSoz}_\n\n`;
              
                      
      // Mesajı göndəririk (linkPreview-nu ləğv etdik ki, altda lazımsız böyük qutu çıxıb görüntünü pozmasın)
      await sock.sendMessage(chatId, { 
        text: mesajMetni
      }, { quoted: msg });

    } catch (error) {
      console.error('Söz əmri xətası:', error);
    }
  }
};
