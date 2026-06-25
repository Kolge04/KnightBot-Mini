module.exports = {
  name: 'mal',
  aliases: ['maliq', 'malolçer'],
  category: 'fun',
  description: 'Cavab (reply) verilən və ya etiketlənən (tag) istifadəçinin mallıq səviyyəsini ölçür',
  usage: '.mal @istifadəçi (və ya mesaja reply)',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      // 1. Hədəf istifadəçini təyin edirik (Etiketlənib, yoxsa reply edilib?)
      let targetId = null;

      // Əgər mesaja reply edilibsə
      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetId = msg.message.extendedTextMessage.contextInfo.participant;
      } 
      // Əgər mesajda kimsə tag (mention) edilibsə
      else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
        targetId = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }

      // 2. Qvardiya: Əgər heç kim hədəf alınmayıbsa (öz-özünə yazırsa) xəbərdarlıq edirik
      if (!targetId) {
        return sock.sendMessage(chatId, { 
          text: '⚠️ *Ay qardaş, öz-özünə mallıq ölçmək olmur!* Zəhmət olmasa kiminsə mesajına *reply (cavab)* ver və ya kimisə *@tag* edərək bu əmri yaz.' 
        }, { quoted: msg });
      }

      // Hədəf adamın nömrəsini təmizləyirik (gözəl görünsün deyə)
      const cleanTarget = targetId.split('@')[0].split(':')[0];

      // Gecikmə (animasiya effekti) üçün köməkçi funksiya
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // 3. İlk mesajı göndəririk (Proses başlayır)
      let sentMsg = await sock.sendMessage(chatId, {
        text: `🧠 *@${cleanTarget} üçün mallıq testi başladıldı...*`,
        mentions: [targetId]
      }, { quoted: msg });

      await sleep(1500);

      // İkinci mərhələ: Redaktə (Edit) edilir
      await sock.sendMessage(chatId, {
        text: `📊 *@${cleanTarget} mallıq səviyyəsi hesablanır... 🕒*`,
        mentions: [targetId],
        edit: sentMsg.key
      });

      await sleep(1500);

      // Üçüncü mərhələ: DNAsı yoxlanılır
      await sock.sendMessage(chatId, {
        text: `🧬 *@${cleanTarget} neyronları və DNT-si analiz edilir... 🧪*`,
        mentions: [targetId],
        edit: sentMsg.key
      });

      await sleep(2000);

      // 4. Random faiz və yekun nəticənin hesablanması
      const randomPercent = Math.floor(Math.random() * 101); // 0 - 100 arası
      let şərh = '';

      if (randomPercent <= 20) {
        şərh = "Dahidir sən öl, mallıqla uzaqdan yaxından əlaqəsi çox azdır. 🧠✨";
      } else if (randomPercent <= 50) {
        şərh = "Normal insandır, hərdən bir beyni çönür o qədər. 🤷‍♂️";
      } else if (randomPercent <= 80) {
        şərh = "Vəziyyət bir az təhlükəlidir, gündəlik mallıq dozası yüksəkdir. ⚠️🏃‍♂️";
      } else {
        şərh = "Xalis, sertifikatlı dərəcədə maldır! Müalicəsi demək olar ki, yoxdur. 🐃🔥";
      }

      // Yekun nəticəni yazırıq
      let sonMetn = `📊 *MALLIQ ÖLÇMƏ NƏTİCƏSİ* 📊\n\n` +
                    `👤 *Hədəf:* @${cleanTarget}\n` +
                    `📈 *Mallıq Səviyyəsi:* \`%${randomPercent}\`\n\n` +
                    `📝 *Sistem şərhi:* _${şərh}_`;

      await sock.sendMessage(chatId, {
        text: sonMetn,
        mentions: [targetId],
        edit: sentMsg.key
      });

    } catch (error) {
      console.error('Mal əmri xətası:', error);
    }
  }
};
