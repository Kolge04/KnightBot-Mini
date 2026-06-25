module.exports = {
  name: 'button',
  aliases: ['bt', 'dugme', 'panel'],
  category: 'fun',
  description: 'Botun interaktiv düyməli menyusunu göstərir',
  usage: '.button',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      // WhatsApp-da işləyən rəsmi İnteraktiv (Interactive) Düymə strukturu
      const interactiveMessage = {
        body: { 
          text: "👋 *Salam! NexusMD Bot Panelunə Xoş Gəldiniz.*\n\nAşağıdakı interaktiv menyudan istifadə edərək bota əmrlər verə bilərsiniz." 
        },
        footer: { 
          text: "🤖 NexusMD Admin Sistemi" 
        },
        header: { 
          title: "🔥 BOT İDARƏ PANELİ",
          hasMediaAttachment: false 
        },
        nativeFlowMessage: {
          buttons: [
            // 1. DÜYMƏ: Klikləyəndə qrup çata xüsusi menyu (siyahı) açır
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
            // 2. DÜYMƏ: Klikləyəndə hansısa saytı və ya linki açır
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 Rəsmi Panelə Daxil Ol",
                url: "https://google.com",
                merchant_url: "https://google.com"
              })
            }
          ],
          messageVersion: 1
        }
      };

      // Baileys vasitəsilə mesajı "viewOnceMessage" daxilində göndəririk (yeni WP qaydası)
      await sock.sendMessage(chatId, {
        viewOnceMessage: {
          message: {
            interactiveMessage: interactiveMessage
          }
        }
      }, { quoted: msg });

    } catch (error) {
      console.error('Düymə göndərmə xətası:', error);
    }
  }
};
