// commands/fun/slap.js
const config = require('../../config');
const SLAP = [
  "nın başına İPHONE 14 PRO atdı 🤕",
  "nın Üstünə qaynar su tökdü 🥵",
  "nın üstünə bilərəkdən kofe tökdü 🤯",
  "a tort atdı 🙄",
  "nın üstündən maşınla keçmək istədi 🥴",
  "ı qrupda söydü 😎",
  "nın çılpaq şəklini instagramda paylaşdı 😌",
  "nın qardaşına söz atdı 🤓",
  "nın üzünə asqırdı 🤧",
  "ə ilə Otelə getdilər 🙄",
  "ə qrupda ban atdı 🤠",
  "ı qrupda səssiz moda aldı ✈",
  "ı qızla parkda gəzərkən gördü 🚲",
  "nın, atasına öz təşəkkürünü bildirdi sjsjsj 🤣"
];

module.exports = {
  name: 'slap',
  aliases: ['sille', 'vur'],
  category: 'fun',
  description: 'Qrupda kiməsə virtual şillə atar və ya sataşar',
  usage: '.slap [@user / reply]',

  async execute(sock, msg, args, extra) {
    try {
      const from = extra.from;
      
      // 1. Əmri yazan şəxs (Göndərən)
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderNumber = senderJid.split('@')[0];
      const senderTag = `@${senderNumber}`;

      // Botun öz nömrəsi (Şillə vurulması qadağan olunan nömrə)
      const botNumber = config.BotNumber; 

      // 2. Hədəf şəxsi təyin edirik (Reply və ya Mention)
      let targetJid = null;

      // Əgər mesaj kiməsə cavabdırsa (reply)
      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
      } 
      // Əgər mesajda kimisə etiketləyibsə (@user)
      else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }

      // Təsadüfi zarafat mətni seçirik
      const randomSlap = SLAP[Math.floor(Math.random() * SLAP.length)];

      // ŞƏRT 3: Əgər hədəf botun özüdürsə, icazə vermə
      if (targetJid && targetJid.includes(botNumber)) {
        return extra.reply("⚠️ *Mənə şillə ata bilməzsən! Özünə hörmət elə. 😤*");
      }

      // ŞƏRT 2: Əgər reply və ya etiketlənən (target) varsa
      if (targetJid) {
        const targetNumber = targetJid.split('@')[0];
        const targetTag = `@${targetNumber}`;

        // Sataşan və sataşılan hər iki şəxsi etiketləyərək mesajı göndəririk
        await sock.sendMessage(from, {
          text: `${senderTag}, ${targetTag}${randomSlap}`,
          mentions: [senderJid, targetJid]
        }, { quoted: msg });
      } 
      // ŞƏRT 1: Əgər sadəcə .slap yazılıbsa (hədəf yoxdursa)
      else {
        await sock.sendMessage(from, {
          text: `${config.botName}, ${senderTag}${randomSlap}`,
          mentions: [senderJid]
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('Slap Command Error:', error);
      await extra.reply("⚠️ **__XƏTA BAŞ VERDİ__**");
    }
  }
};
