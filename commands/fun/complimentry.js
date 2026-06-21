/**
 * Compliment - Send a random compliment
 */

module.exports = {
    name: 'soz',
    aliases: ['dvij', 'compliment'],
    category: 'fun',
    desc: 'Get a random compliment',
    usage: 'compliment [@user]',
    execute: async (sock, msg, args) => {
      try {
        const compliments = [
          "Sən möhtəşəm dostsan! 💙",
          "Sən otağı işıqlandırırsan! ✨",
          "Sən kiminsə gülümsəməsi üçün səbəbsən! 😊",
          "Sən təkbuynuzdan da yaxşısan! 🦄",
          "Sən ətrafdakılara hədiyyəsən! 🎁",
          "Sən ağıllı peçenyesən! 🍪",
          "Sən möhtəşəmsən! 🌟",
          "Ən gözəl gülüşün var! 😄",
          "Sən gözəlsən! 💖",
          "Siz düşündüyünüzdən daha faydalısınız! 🤝",
          "Möhtəşəm yumor hissi var! 😂",
          "Sən həqiqətən xüsusi bir şeysən! ⭐",
          "Sən inanılmaz dostsan! 🫂",
          "Sizin perspektiviniz təravətləndiricidir! 🌈",
          "Fərq edirsən! 🌍",
          "Sən düşündüyündən daha güclüsən! 💪",
          "Gülüşün yoluxucudur! 😁",
          "Sən bənzərsizsən! 💎",
          "İnsanların ən yaxşısını ortaya qoyursan! 👏",
          "Sən ruhlandırıcısan! 🌟"
        ];
        
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];
        
        if (mentioned.length > 0) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: `${randomCompliment}`,
            mentions: mentioned
          }, { quoted: msg });
        } else {
          await sock.sendMessage(msg.key.remoteJid, {
            text: `${randomCompliment}`
          }, { quoted: msg });
        }
        
      } catch (error) {
        console.error('Compliment Error:', error);
        await sock.sendMessage(msg.key.remoteJid, {
          text: `❌ Error: ${error.message}`
        }, { quoted: msg });
      }
    }
  };
  
