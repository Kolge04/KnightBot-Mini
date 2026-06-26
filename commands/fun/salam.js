// 👋 Avtomatik Salamlaşma və Animasiya Modulu
const handleSalamlasma = async (sock, msg) => {
  try {
    const chatId = msg.key.remoteJid;
    if (!chatId) return false;

    // Gələn mesaj mətni oxunur
    const mesajMetni = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text || ''
    ).trim().toLowerCase();

    // Əgər yazılan söz tam olaraq "salam" deyilsə, funksiyanı dayandır
    if (mesajMetni !== 'salam') return false;

    // Sürətli gözləmə (sleep) funksiyası
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 1. İlk olaraq "Salam Aleykuma.." mesajını göndəririk
    let sentMsg = await sock.sendMessage(chatId, { 
      text: "👋 Salam Aleykuma..",
      quoted: msg // Kimin mesajına cavab verdiyini göstərmək üçün (Reply)
    });

    // Zəmanətli mesaj ID-si (key) seçimi
    const messageKey = sentMsg.key || sentMsg[0]?.key;
    if (!messageKey) return true;

    // 2. 2 saniyə gözləyib "Xoş Gəldin" olaraq redaktə edirik
    await sleep(2000);
    await sock.sendMessage(chatId, { text: "🌹 Xoş Gəldin", edit: messageKey });

    // 3. 2 saniyə gözləyib "Necəsən?" olaraq redaktə edirik
    await sleep(2000);
    await sock.sendMessage(chatId, { text: "🤔 Necəsən?", edit: messageKey });

    // 4. 2 saniyə gözləyib sonuncu mesajı yazırıq və SİLMİRİK (Qrupda daimi qalır)
    await sleep(2000);
    await sock.sendMessage(chatId, { text: "❤️ Ümid Varam Yaxşısan...", edit: messageKey });

    return true; // Mesaj işləndi
  } catch (err) {
    console.error('Salamlaşma modulu xətası:', err);
    return false;
  }
};
