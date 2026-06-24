/**
 * Silinən Son Mesajı Göstərmək Əmri
 */

module.exports = {
  name: 'msj',
  aliases: ['silinen', 'bax'],
  category: 'utility',
  description: 'Çatda silinən sonuncu mətn mesajını göstərir',
  usage: '.msj',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      
      // Baileys-in daxili mesaj yaddaşını (store) yoxlayırıq
      if (!extra.store || !extra.store.messages || !extra.store.messages[chatId]) {
        return extra.reply('❌ Bu çat üçün mesaj tarixçəsi tapılmadı və ya hələ keşlənməyib.');
      }

      // Cari çatdakı bütün mesajları massiv (array) halına salırıq
      const chatMessages = extra.store.messages[chatId].array;

      // Sondan geriyə doğru silinmiş (protocolMessage) ilk mesajı axtarırıq
      let foundDeleted = null;
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        const m = chatMessages[i];
        if (m.message?.protocolMessage && m.message.protocolMessage.type === 0) {
          foundDeleted = m.message.protocolMessage;
          break; // Sonuncunu tapdıq, dövrü dayandırırıq
        }
      }

      if (!foundDeleted) {
        return extra.reply('🤷‍♂️ Bu çatda yaxın zamanda silinmiş mesaj tapılmadı.');
      }

      // Silinən mesajın unikal ID-si vasitəsilə köhnə orijinal mesajı bazadan (keşdən) tapırıq
      const originalMsg = chatMessages.find(m => m.key.id === foundDeleted.key.id);

      if (!originalMsg || !originalMsg.message) {
        return extra.reply('⚠️ Mesajın silindiyini gördüm, amma silinməzdən əvvəlki mətni yaddaşda (keşdə) tapılmadı.');
      }

      // Orijinal mesajın içindəki mətni çıxarırıq (fərqli mesaj növlərinə görə)
      const oldText = originalMsg.message.conversation || 
                      originalMsg.message.extendedTextMessage?.text || 
                      (originalMsg.message.imageMessage ? '[Şəkil Mesajı]' : null) || 
                      (originalMsg.message.videoMessage ? '[Video Mesajı]' : null) || 
                      ' Müəyyən edilə bilməyən media və ya stiker';

      const senderId = originalMsg.key.participant || originalMsg.key.remoteJid;
      const cleanSender = senderId.split('@')[0].split(':')[0];
      const vaxt = new Date(originalMsg.messageTimestamp * 1000).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });

      // Cavab mətnini hazırlayırıq
      let cavabMetni = `🕵️‍♂️ *SİLİNƏN SON MESAJ TAPILDI!* 🕵️‍♂️\n\n` +
                        `👤 *Göndərən:* @${cleanSender}\n` +
                        `🕒 *Yazılma vaxtı:* ${vaxt}\n` +
                        `💬 *Silinən mətn:* \n\n> _${oldText}_`;

      // Həm qrupda (mentions ilə), həm özəldə normal şəkildə cavab verir
      await sock.sendMessage(chatId, {
        text: cavabMetni,
        mentions: [senderId]
      }, { quoted: msg });

    } catch (error) {
      console.error('msj əmrində xəta:', error);
      await extra.reply(`❌ Xəta baş verdi: ${error.message}`);
    }
  }
};
