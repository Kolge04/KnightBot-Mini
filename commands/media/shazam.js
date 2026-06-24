const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');
const crypto = require('crypto');
const axios = require('axios');
const config = require('../../config'); // Config faylından məlumatları çəkirik

// Məlumatları birbaşa sənin config.js faylından mənimsədirik
const ACR_HOST = config.ACR_HOST;
const ACR_ACCESS_KEY = config.ACR_ACCESS_KEY;
const ACR_SECRET = config.ACR_SECRET;

module.exports = {
  name: 'shazam',
  aliases: ['shaz', 'tap', 'mahnitap'],
  category: 'media',
  description: 'Cavab (reply) verilən səs yazısı və ya videodakı mahnını tapır',
  usage: '.shazam (səsə və ya videoya cavab olaraq)',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      // 1. Sitat gətirilən (quoted) mesaj varmı yoxlayırıq
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMsg) {
        return sock.sendMessage(chatId, { text: '❌ Zəhmət olmasa tapmaq istədiyiniz bir *səs yazısına* və ya *videoya* reply (cavab) yazaraq bu əmri işlədin.' }, { quoted: msg });
      }

      // 2. SƏS VƏ VİDEO YOXLAMASI (Mətn, stiker və s. bloklanır)
      const isAudio = quotedMsg.audioMessage;
      const isVideo = quotedMsg.videoMessage;

      if (!isAudio && !isVideo) {
        return sock.sendMessage(chatId, { text: '⚠️ Bu səs yazısı və ya video deyil! .shazam əmri yalnız səs qeydləri və videolar üzərində işləyir.' }, { quoted: msg });
      }

      // Baileys üçün düzgün kontekst obyektini qururuq
      const contextInfo = msg.message.extendedTextMessage.contextInfo;
      const fakeOriginalMsg = {
        key: {
          remoteJid: chatId,
          id: contextInfo.stanzaId,
          participant: contextInfo.participant
        },
        message: quotedMsg
      };

      // Medianın növünə uyğun olaraq istifadəçiyə bildiriş göndəririk
      const mediaType = isAudio ? 'Səs' : 'Video';
      await sock.sendMessage(chatId, { text: `🔍 *${mediaType} yüklənir və analiz edilir, mahnı axtarılır... Lütfən gözləyin...*` }, { quoted: msg });

      // 3. Media faylını (Səs və ya Video) WhatsApp serverlərindən buffer olaraq endiririk
      // Baileys 'audio' və ya 'video' növünü avtomatik təyin edir
      const downloadType = isAudio ? 'buffer' : 'buffer'; 
      const buffer = await downloadMediaMessage(fakeOriginalMsg, 'buffer', {}, {
        logger: extra.logger || console
      });

      if (!buffer) {
        return sock.sendMessage(chatId, { text: `❌ ${mediaType} faylını yükləmək mümkün olmadı.` }, { quoted: msg });
      }

      // Config yoxlaması - Əgər açarlar boşdursa xəbərdarlıq etsin
      if (!ACR_HOST || !ACR_ACCESS_KEY || !ACR_SECRET) {
        return sock.sendMessage(chatId, { text: '❌ Sistem xətası: `config.js` faylında ACRCloud (Shazam) açarları tapılmadı!' }, { quoted: msg });
      }

      // 4. ACRCloud API üçün İmza (Signature) hazırlığı
      const current_data = new Date();
      const timestamp = Math.floor(current_data.getTime() / 1000);
      const stringToSign = [
        'POST',
        '/v1/identify',
        ACR_ACCESS_KEY,
        'audio',
        '1',
        timestamp
      ].join('\n');

      const signature = crypto
        .createHmac('sha1', ACR_SECRET)
        .update(Buffer.from(stringToSign, 'utf-8'))
        .digest()
        .toString('base64');

      // FormData strukturunu yığırıq
      const form = new FormData();
      // Videodursa mp4, səddirsə mp3 olaraq tanıtdırırıq (API hər iki strukturu qəbul edir)
      const filename = isAudio ? 'audio.mp3' : 'video.mp4';
      const contentType = isAudio ? 'audio/mp3' : 'video/mp4';

      form.append('sample', buffer, { filename, contentType });
      form.append('access_key', ACR_ACCESS_KEY);
      form.append('data_type', 'audio'); // API arxa fonda audio axınını oxuyacaq
      form.append('signature_version', '1');
      form.append('signature', signature);
      form.append('sample_bytes', buffer.length);
      form.append('timestamp', timestamp);

      // API-yə sorğu göndəririk
      const response = await axios.post(`https://${ACR_HOST}/v1/identify`, form, {
        headers: form.getHeaders(),
        timeout: 20000 // Videolar bir az daha böyük ola bilər deyə timeout-u 20 saniyə etdik
      });

      const result = response.data;

      // 5. Nəticəni analiz edirik
      if (result.status && result.status.code === 0 && result.metadata?.music?.[0]) {
        const music = result.metadata.music[0];
        const title = music.title || 'Bilinmir';
        const artist = music.artists?.map(a => a.name).join(', ') || 'Bilinmir';
        const album = music.album?.name || 'Bilinmir';
        const releaseDate = music.release_date || 'Bilinmir';

        let cavabMetni = `🎵 *MAHNI TAPILDI!* ${config.botName}🎵\n\n` +
                          `🎼 *Mahnı adı:* ${title}\n` +
                          `👤 *Müənnif (Artist):* ${artist}\n` +
                          `💿 *Albom:* ${album}\n` +
                          `📅 *Buraxılış ili:* ${releaseDate}\n\n` +
                          `✅ _Uğurla tapıldı!_`;

        await sock.sendMessage(chatId, { text: cavabMetni }, { quoted: msg });
      } else {
        await sock.sendMessage(chatId, { text: `🤷‍♂️ Təəssüf ki, bu ${mediaType.toLowerCase()} daxilindəki mahnını tanıya bilmədim. Səs çox boğuq, qısa və ya musiqisiz ola bilər.` }, { quoted: msg });
      }

    } catch (error) {
      console.error('Shazam xətası:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Xəta baş verdi: ${error.message}` }, { quoted: msg });
    }
  }
};
