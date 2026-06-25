const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'button',
  aliases: ['menu', 'dugme', 'panel'],
  category: 'util',
  description: 'Botun interaktiv düyməli menyusunu göstərir',
  usage: '.button',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      // 1. İnteraktiv mesajın strukturunu hazırlayırıq
      const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({
          text: "👋 *Salam! NexusMD Bot Panelinə Xoş Gəldiniz.*\n\nAşağıdakı interaktiv menyudan istifadə edərək bota əmrlər verə bilərsiniz."
        }),
        footer: proto.Message.InteractiveMessage.Footer.create({
          text: "🤖 NexusMD Admin Sistemi"
        }),
        header: proto.Message.InteractiveMessage.Header.create({
          title: "🔥 BOT İDARƏ PANELİ",
          hasMediaAttachment: false
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons: [
            // 1-ci Düymə: Açılan menyu siyahısı
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "📋 Əmr Menyusunu Aç",
                sections: [
                  {
                    title: "🎵 Media Əmrləri",
                    highlight_label: "YENİ",
                    rows: [
                      {
                        id: ".shazam",
                        title: "🔍 Shazam (Mahnı Tap)",
                        description: "Səsə və ya videoya reply edərək mahnını tapır"
                      }
                    ]
                  },
                  {
                    title: "🎉 Əyləncə Əmrləri",
                    rows: [
                      {
                        id: ".mal",
                        title: "📊 Mallıq Ölçər",
                        description: "Hədəf adamın mallıq səviyyəsini analiz edir"
                      }
                    ]
                  }
                ]
              })
            },
            // 2-ci Düymə: Link düyməsi
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 Rəsmi Panelə Daxil Ol",
                url: "https://google.com",
                merchant_url: "https://google.com"
              })
            }
          ]
        })
      });

      // 2. Baileys media yoxlamasından yan keçmək üçün mesajı əvvəlcədən generat edirik
      const prep = generateWAMessageFromContent(
        chatId,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage: interactiveMessage
            }
          }
        },
        { userJid: sock.user.id, quoted: msg }
      );

      // 3. Mesajı `relayMessage` vasitəsilə birbaşa şırnağa (stream) buraxırıq
      await sock.relayMessage(chatId, prep.message, { messageId: prep.key.id });

    } catch (error) {
      console.error('Düymə göndərmə xətası:', error);
    }
  }
};
