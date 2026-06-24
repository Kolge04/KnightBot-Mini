const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');
const crypto = require('crypto');
const axios = require('axios');

// ⚠️ BURANI ACRCLOUD-DAN ALDIĞIN MƏLUMATLARLA DOLDUR!
const ACR_HOST = 'identify-ap-southeast-1.acrcloud.com';
const ACR_ACCESS_KEY = 'e7ce31706d1fff7d677552b48340f9d7';
const ACR_SECRET = 'oUA8Wq3M4HQDIlSNoUIBXqAkx2jnxjHV0csxZnHR';

module.exports = {
  name: 'shazam',
  aliases: ['shaz', 'tap', 'mahnitap'],
  category: 'media',
  description: 'Cavab (reply) verilən səs yazısının hansı mahnı olduğunu tapır',
  usage: '.shazam (səs yazısına cavab olaraq)',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      // 1. Sitat gətirilən (quoted) mesaj varmı yoxlayırıq
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMsg) {
        return sock.sendMessage(chatId, { text: '❌ Zəhmət olmasa tapmaq istədiyiniz bir səs yazısına və ya audioya *reply (cavab)* yazaraq bu əmri işlədin.' }, { quoted: msg });
      }

      // 2. YALNIZ SƏS VƏ AUDİO YOXLAMASI (Mətn, stiker və s. bloklanır)
      const isAudio = quotedMsg.audioMessage;
      if (!isAudio) {
        return sock.sendMessage(chatId, { text: '⚠️ Bu səs yazısı deyil! .shazam əmri yalnız səs qeydləri və audio fayllar üzərində işləyir.' }, { quoted: msg });
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

      await sock.sendMessage(chatId, { text: '🔍 *Səs analiz edilir, mahnı axtarılır... Lütfən gözləyin...*' }, { quoted: msg });

      // 3. Səs faylını WhatsApp serverlərindən buffer olaraq endiririk
      const buffer = await downloadMediaMessage(fakeOriginalMsg, 'buffer', {}, {
        logger: extra.logger || console
      });

      if (!buffer) {
        return sock.sendMessage(chatId, { text: '❌ Səs faylını yükləmək mümkün olmadı.' }, { quoted: msg });
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
      form.append('sample', buffer, { filename: 'audio.mp3', contentType: 'audio/mp3' });
      form.append('access_key', ACR_ACCESS_KEY);
      form.append('data_type', 'audio');
      form.append('signature_version', '1');
      form.append('signature', signature);
      form.append('sample_bytes', buffer.length);
      form.append('timestamp', timestamp);

      // API-yə sorğu göndəririk
      const response = await axios.post(`https://${ACR_HOST}/v1/identify`, form, {
        headers: form.getHeaders(),
        timeout: 15000
      });

      const result = response.data;

      // 5. Nəticəni analiz edirik
      if (result.status && result.status.code === 0 && result.metadata?.music?.[0]) {
        const music = result.metadata.music[0];
        const title = music.title || 'Bilinmir';
        const artist = music.artists?.map(a => a.name).join(', ') || 'Bilinmir';
        const album = music.album?.name || 'Bilinmir';
        const releaseDate = music.release_date || 'Bilinmir';

        let cavabMetni = `🎵 *MAHNI TAPILDI! (Shazam)* 🎵\n\n` +
                          `🎼 *Mahnı adı:* ${title}\n` +
                          `👤 *Müənnif (Artist):* ${artist}\n` +
                          `💿 *Albom:* ${album}\n` +
                          `📅 *Buraxılış ili:* ${releaseDate}\n\n` +
                          `🤖 _Bot tərəfindən uğurla tapıldı!_`;

        await sock.sendMessage(chatId, { text: cavabMetni }, { quoted: msg });
      } else {
        // Əgər tapılmadısa və ya səs çox qısadırsa
        await sock.sendMessage(chatId, { text: '🤷‍♂️ Təəssüf ki, bu səsdəki mahnını tanıya bilmədim. Səs çox qısa, kəsintili və ya kənar səs-küylü ola bilər.' }, { quoted: msg });
      }

    } catch (error) {
      console.error('Shazam xətası:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Xəta baş verdi: ${error.message}` }, { quoted: msg });
    }
  }
};
