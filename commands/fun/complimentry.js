// commands/soz.js
const sozlerBazasi = require('../../word'); // Eyni qovluqdakı wortds.js faylından oxuyur

module.exports = {
  name: 'soz',
  aliases: ['söz', 'word', 'randomsoz'],
  category: 'fun',
  description: 'Sözlər bazasından təsadüfi (random) bir söz göndərir',
  usage: '.soz',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      // 1. Bazada söz olub-olmadığını yoxlayırıq
      if (!sozlerBazasi || sozlerBazasi.length === 0) {
        return sock.sendMessage(chatId, { text: '❌ Sözlər bazası boşdur və ya tapılmadı.' }, { quoted: msg });
      }

      // 2. Təsadüfi indekslə sözü seçirik
      const randomIndex = Math.floor(Math.random() * sozlerBazasi.length);
      const secilenSoz = sozlerBazasi[randomIndex];

      // 3. İstifadəçinin yazı sətirini avtomatik dolduran wa.me linki
      const butonKimiLink = `https://wa.me/${sock.user.id.split(':')[0]}?text=.soz`;

      // 4. Mesajın xarici görünüşü
      let mesajMetni = `📝 *GÜNÜN SÖZÜ:* \n\n` +
                        `> _${secilenSoz}_\n\n` +
                        `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n` +
                        `🔄 Yenisini gətirmək üçün klikləyin:\n` +
                        `👉 [🔄 Yenidən](${butonKimiLink})`;

      // 5. Mesajı çata göndəririk
      await sock.sendMessage(chatId, { 
        text: mesajMetni,
        linkPreview: { 
          "canonical-url": butonKimiLink,
          "matched-url": butonKimiLink,
          "title": "Yenidən Söz Gətir"
        }
      }, { quoted: msg });

    } catch (error) {
      console.error('Söz əmri xətası:', error);
    }
  }
};
