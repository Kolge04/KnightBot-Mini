// Qorunan qrupların siyahısını saxlamaq üçün massiv (Array)
// Qeyd: Bot hər dəfə tam sönüb yananda bu siyahı sıfırlanacaq. 
// Daimi qalmasını istəsən gələcəkdə verilənlər bazası (database) qoşa bilərik.
if (!global.linkKorumasi) {
  global.linkKorumasi = [];
}

module.exports = {
  name: 'link',
  aliases: ['link_close', 'link-engel'],
  category: 'fun',
  description: 'Qrupda link və mobil nömrə göndərilməsini bağlayır və ya açır',
  usage: '.link on / off',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      // 1. Qrup yoxlaması (Şəxsi çatda bu əmr işləməməlidir)
      if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, { text: '❌ Bu əmr yalnız qruplarda istifadə edilə bilər!' }, { quoted: msg });
      }

      // 2. Admin Yoxlaması: Əmri yazan şəxs qrup adminidirmi?
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants;
      const sender = msg.key.participant || msg.key.remoteJid;
      
      const isAdmin = participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

      if (!isAdmin) {
        return sock.sendMessage(chatId, { text: '⛔ *Siz admin deyilsiniz!* Bu əmr sadəcə qrup adminləri üçün keçərlidir.' }, { quoted: msg });
      }

      const emr = args[0]?.toLowerCase();

      // 3. ON - Aktivləşdirmə mərhələsi
      if (emr === 'on') {
        if (!global.linkKorumasi.includes(chatId)) {
          global.linkKorumasi.push(chatId);
          let aktiv_metn = `✅ *Tamamdır Paşam!* \n` +
                            `🗑️ Artıq qrupa atılan hər bir link və nömrəni siləcəm.\n` +
                            `⛔ _YouTube, WhatsApp, Telegram, İnstagram, Mobil nömrələr və s. tam qorunur._`;
          return sock.sendMessage(chatId, { text: aktiv_metn }, { quoted: msg });
        }
        return sock.sendMessage(chatId, { text: '⚠️ *Link qoruması bu qrupda onsuz da aktivdir!*' }, { quoted: msg });
      }

      // 4. OFF - Deaktivləşdirmə mərhələsi
      else if (emr === 'off') {
        if (global.linkKorumasi.includes(chatId)) {
          global.linkKorumasi = global.linkKorumasi.filter(id => id !== chatId);
          return sock.sendMessage(chatId, { text: '⛔️ *Tamamdır Paşam!* \n🗑️ Artıq qrupa göndərilən linkləri və nömrələri silməyəcəm.' }, { quoted: msg });
        }
        return sock.sendMessage(chatId, { text: '⚠️ *Link qoruması bu qrupda onsuz da deaktivdir!*' }, { quoted: msg });
      }

      // 5. Yanlış parametr yazıldıqda
      else {
        return sock.sendMessage(chatId, { text: '✅ Link qorumasını aktivləşdirmək üçün: `.link on` \n❌ Söndürmək üçün: `.link off` yazın.' }, { quoted: msg });
      }

    } catch (error) {
      console.error('Link əmri xətası:', error);
    }
  }
};
