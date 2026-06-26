// commands/general/heart.js

const URE = ["🩷", "❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🖤", "🩶", "🤍", "🤎", "❤️‍🩹"];

// Sürətli yuxu (sleep) funksiyası
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'heart',
  aliases: ['urek', 'anim'],
  category: 'fun',
  description: 'Mətn ətrafında animasiyalı ürəklər parıldadır',
  usage: '.heart <mətn>',
  
  async execute(sock, msg, args, extra) {
    try {
      // 1. Mətn yoxlaması
      if (args.length === 0) {
        return extra.reply("❌ *Xahiş olunur bir söz yazıb yenidən cəhd edin!* 📣");
      }

      const text = args.join(' ');

      // 2. Əmri yazan şəxsin orijinal mesajını dərhal silirik
      try {
        await sock.sendMessage(extra.from, { delete: msg.key });
      } catch (e) {
        // Adminlik yoxdursa xətanı gizlət
      }

      const r = () => URE[Math.floor(Math.random() * URE.length)]; // Random emoji funksiyası
      
      // 3. İlk ana mesajı göndəririk
      let sentMsg = await sock.sendMessage(extra.from, { 
        text: `${r()}${r()}${r()} *${text}* ${r()}${r()}${r()}` 
      });

      // Baileys-də bəzən mesaj obyekti fərqli qatda gəlir, zəmanətli key seçimi:
      const messageKey = sentMsg.key || sentMsg[0]?.key;

      if (!messageKey) {
        return console.error("Heart Command: Göndərilən mesajın ID-si (key) tapılmadı.");
      }

      // 4. Animasiya Dövrü (Loop) - HƏR SƏFƏR EYNİ MESAJI REDAKTƏ EDİR
      for (let i = 0; i < 11; i++) {
        await sleep(500); // 0.5 saniyə gözləmə

        // Baileys rəsmi mesaj redaktə strukturu
        await sock.sendMessage(extra.from, {
          text: `${r()}${r()}${r()} *${text}* ${r()}${r()}${r()}`,
          edit: messageKey
        });
      }

      // 5. Animasiya bitdikdən sonra redaktə olunan mesajı tamamilə silirik
      await sleep(500);
      await sock.sendMessage(extra.from, { delete: messageKey });

    } catch (error) {
      console.error('Heart command error:', error);
    }
  }
};
