/**
 * Facebook Downloader - Fixed 403 Forbidden Issue & Translated to AZ
 */

const axios = require('axios');
const config = require('../../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'facebook',
  aliases: ['fb', 'fbdl', 'facebookdl'],
  category: 'media',
  description: 'Download Facebook videos',
  usage: '.facebook <Facebook URL>',
  
  async execute(sock, msg, args, extra) {
    try {
      // Check if message has already been processed
      if (processedMessages.has(msg.key.id)) {
        return;
      }
      
      // Add message ID to processed set
      processedMessages.add(msg.key.id);
      
      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        processedMessages.delete(msg.key.id);
      }, 5 * 60 * 1000);
      
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text ||
                   args.join(' ');
      
      if (!text) {
        return await extra.reply('Zəhmət olmasa video üçün Facebook linki daxil edin.');
      }
      
      // Extract URL from command
      const url = text.split(' ').slice(1).join(' ').trim();
      
      if (!url) {
        return await extra.reply('Zəhmət olmasa video üçün Facebook linki daxil edin.');
      }
      
      // Check for various Facebook URL formats
      const facebookPatterns = [
        /https?:\/\/(?:www\.|m\.)?facebook\.com\//,
        /https?:\/\/(?:www\.|m\.)?fb\.com\//,
        /https?:\/\/fb\.watch\//,
        /https?:\/\/(?:www\.)?facebook\.com\/watch/,
        /https?:\/\/(?:www\.)?facebook\.com\/.*\/videos\//
      ];
      
      const isValidUrl = facebookPatterns.some(pattern => pattern.test(url));
      
      if (!isValidUrl) {
        return await extra.reply('Bu keçərli bir Facebook linki deyil. Zəhmət olmasa doğru bir video linki daxil edin.');
      }
      
      await sock.sendMessage(extra.from, {
        react: { text: '🔄', key: msg.key }
      });
      
      try {
        // Bloklanan köhnə paket yerinə yeni stabil API sorğusu
        const apiRes = await axios.get(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, { timeout: 30000 });
        
        if (!apiRes.data || !apiRes.data.status || !apiRes.data.data) {
          throw new Error('Video məlumatları tapılmadı');
        }

        const apiData = apiRes.data.data;
        
        // Mövcud kodun strukturunu qorumaq üçün eyni video massivi simulyasiya edirik
        const videoQualityUrls = [];
        if (apiData.hd) videoQualityUrls.push({ quality: 'HD', downloadUrl: apiData.hd });
        if (apiData.sd) videoQualityUrls.push({ quality: 'SD', downloadUrl: apiData.sd });
        
        if (videoQualityUrls.length === 0) {
          throw new Error('Yükləmək üçün video linki tapılmadı (HD/SD)');
        }
        
        // Ən yüksək keyfiyyətli variantı seçirik
        const videoOption = videoQualityUrls[0];
        const videoUrl = videoOption.downloadUrl;
        
        let videoBuffer = null;
        
        // Build caption with video info
        const botName = config.botName.toUpperCase();
        let caption = `*YÜKLƏDİ: ${botName}*`;
        
        const parts = [];
        
        if (apiData.title) {
          parts.push(`📝 Başlıq: ${apiData.title.slice(0, 60)}...`);
        }
        
        if (videoOption.quality) {
          parts.push(`📹 Keyfiyyət: ${videoOption.quality}`);
        }
        
        if (parts.length > 0) {
          caption += '\n\n' + parts.join('\n');
        }
        
        // Birbaşa URL metodu (Try URL first)
        try {
          await sock.sendMessage(extra.from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: caption
          }, { quoted: msg });
        } catch (urlError) {
          // Əgər birbaşa link uğursuz olarsa, server tərəfə buffer kimi çəkirik
          console.error('URL ilə göndərmə uğursuz oldu, buffer metodu yoxlanılır:', urlError.message);
          try {
            const videoResponse = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              maxContentLength: 100 * 1024 * 1024,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.facebook.com/'
              }
            });
            
            const buffer = Buffer.from(videoResponse.data);
            await sock.sendMessage(extra.from, {
              video: buffer,
              mimetype: 'video/mp4',
              caption: caption
            }, { quoted: msg });
          } catch (bufferError) {
            console.error('Buffer metodu da uğursuz oldu:', bufferError.message);
            throw new Error('Video göndərilə bilmədi');
          }
        }
        
      } catch (error) {
        console.error('Facebook yükləmə xətası:', error);
        await extra.reply(`❌ Facebook videosu yüklənə bilmədi.\n\nXəta: ${error.message || 'Bilinməyən xəta'}\n\nZəhmət olmasa başqa bir link ilə yenidən yoxlayın.`);
      }
    } catch (error) {
      console.error('Facebook əmrində xəta:', error);
      await extra.reply('Sorğu işlənərkən xəta baş verdi. Zəhmət olmasa bir az sonra yenidən yoxlayın.');
    }
  }
};
