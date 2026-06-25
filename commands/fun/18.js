// 🤬 Söyüş / Təhqir qoruması - Söyüşləri silir və random cavab verir
const handleSoyusKoruma = async (sock, msg, groupMetadata) => {
  try {
    const chatId = msg.key.remoteJid;
    if (!chatId || !chatId.endsWith('@g.us')) return false; // Yalnız qruplarda işləsin

    const soyusCavablari = require('../../word'); // Cavab bazasını çəkirik

    const mesajMetni = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption || ''
    ).toLowerCase();

    // Telegram kodundakı bütün söyüşləri əhatə edən Regex siyahısı
    const soyusRegexler = [
      /s[iı]k+/i, /pox+/i, /da[sş]ax+/i, /p[eə]ys[eə]r+/i,
      /g[iı]jdlaa[ghx]+/i, /c[ıi]nd[ıi]r+/i, /q[əe]hb[əe]+/i,
      /dalbayov+/i, /c[iı]r+/i
    ];

    // Mesajda söyüş olub-olmadığını yoxlayırıq
    const hasSoyus = soyusRegexler.some(regex => regex.test(mesajMetni));
    if (!hasSoyus) return false;

    const sender = msg.key.participant || msg.key.remoteJid;

    // Admin və ya Owner (Sahib) söyüş söyübsə, toxunmuruq (Telegramdakı kimi)
    const senderIsAdmin = await isAdmin(sock, sender, chatId, groupMetadata);
    const senderIsOwner = isOwner(sender);
    if (senderIsAdmin || senderIsOwner) return false;

    // 1. Söyüş qeydə alındı: Mesajı dərhal silirik
    await sock.sendMessage(chatId, { delete: msg.key });

    // 2. Cavab bazasından tam random bir reaksiya seçirik
    const randomCavab = soyusCavablari[Math.floor(Math.random() * soyusCavablari.length)];

    // 3. Qrupa xəbərdarlıq göndəririk
    await sock.sendMessage(chatId, { text: randomCavab });

    return true; // Mesaj işləndi, digər modullara keçmə
  } catch (err) {
    console.error('Söyüş qoruması xətası:', err);
    return false;
  }
};
