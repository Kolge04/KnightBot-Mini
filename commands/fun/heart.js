// commands/general/heart.js

const URE = ["🩷", "❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🖤", "🩶", "🤍", "🤎", "❤️‍🩹"];

// Sürətli yuxu (sleep) funksiyası
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'heart',
  aliases: ['urek', 'anim'],
  category: 'general',
  description: 'Mətn ətrafında animasiyalı ürəklər parıldadır və silmir',
  usage: '.heart <mətn>',
  
  async execute(sock, msg, args, extra) {
    try {
      // 1. Mətn yoxlaması
      if (args.length === 0) {
        return extra.reply("❌ *Xahiş olunur bir söz yazıb yenidən cəhd edin!* 📣");
      }

      const text = args.join(' ');

      // QEYD: Əmri yazan şəxsin mesajını silən hissə bütövlüklə çıxarıldı (.heart mətni qalacaq)

      const r = () => URE[Math.floor(Math.random() * URE.length)]; // Random emoji funksiyası
      
      // 2. İlk ana mesajı göndəririk
      let sentMsg = await sock.sendMessage(extra.from, { 
        text: `${r()}${r()}${r()} *${text}* ${r()}${r()}${r()}` 
      });

      // Zəmanətli key seçimi
      const messageKey = sentMsg.key || sentMsg[0]?.key;

      if (!messageKey) {
        return console.error("Heart Command: Göndərilən mesajın ID-si (key) tapılmadı.");
      }

      // 3. Animasiya Dövrü (Loop) - Hər səfər eyni mesajı redaktə (edit) edir
      for (let i = 0; i < 11; i++) {
        await sleep(500); // 0.5 saniyə gözləmə

        await sock.sendMessage(extra.from, {
          text: `${r()}${r()}${r()} *${text}* ${r()}${r()}${r()}`,
          edit: messageKey
        });
      }

      // QEYD: Sonda mesajı silən hissə çıxarıldı, sonuncu emojili mətn qrupda daimi qalacaq!

    } catch (error) {
      console.error('Heart command error:', error);
    }
  }
};
