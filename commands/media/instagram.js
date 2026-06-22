/**
 * Instagram Downloader - Fixed Internal Scraper Issue
 */

const axios = require('axios'); // ruhend-scraper yerinə birbaşa sorğu üçün
const config = require('../../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

// Function to extract unique media URLs with simple deduplication
function extractUniqueMedia(mediaData) {
  const uniqueMedia = [];
  const seenUrls = new Set();
  
  for (const media of mediaData) {
    if (!media.url) continue;
    
    // Only check for exact URL duplicates
    if (!seenUrls.has(media.url)) {
      seenUrls.add(media.url);
      uniqueMedia.push(media);
    }
  }
  
  return uniqueMedia;
}

// Function to validate media URL
function isValidMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Accept any URL that looks like media
  return url.includes('cdninstagram.com') || 
         url.includes('instagram') || 
         url.includes('http');
}

module.exports = {
  name: 'instagram',
  aliases: ['ig', 'insta'],
  category: 'media',
  description: 'Instagram fotolarını/videolarını/makaralarını yükləyin',
  usage: '.instagram <Instagram URL>',
  
  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      
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
        return extra.reply('Zəhmət olmasa video üçün Instagram linkini təqdim edin.');
      }
      
      // Check for various Instagram URL formats
      const instagramPatterns = [
        /https?:\/\/(?:www\.)?instagram\.com\//,
        /https?:\/\/(?:www\.)?instagr\.am\//,
        /https?:\/\/(?:www\.)?instagram\.com\/p\//,
        /https?:\/\/(?:www\.)?instagram\.com\/reel\//,
        /https?:\/\/(?:www\.)?instagram\.com\/tv\//
      ];
      
      const isValidUrl = instagramPatterns.some(pattern => pattern.test(text));
      
      if (!isValidUrl) {
        return extra.reply('Bu etibarlı Instagram linki deyil. Zəhmət olmasa etibarlı Instagram postu, çarx və ya video linki təqdim edin.');
      }
      
      await sock.sendMessage(chatId, {
        react: { text: '📥', key: msg.key }
      });
      
      // BLOKLANMIŞ ruhend-scraper YERİNƏ STABİL PROXY API SORĞUSU
      let downloadData = null;
      try {
        const res = await axios.get(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(text)}`, { timeout: 15000 });
        if (res.data && res.data.status && res.data.data) {
          // Mövcud kodun oxuya bilməsi üçün eyni array strukturuna salırı rectangles
          downloadData = {
            data: res.data.data.map(item => ({
              url: item.url,
              type: item.type || (item.url.includes('mp4') ? 'video' : 'image')
            }))
          };
        }
      } catch (apiErr) {
        console.error('Alt API xətası:', apiErr);
      }
      
      if (!downloadData || !downloadData.data || downloadData.data.length === 0) {
        return extra.reply('❌ Verilən linkdə heç bir media tapılmadı. Post şəxsi ola bilər və ya link etibarsızdır.');
      }
      
      const mediaData = downloadData.data;
      
      // Simple deduplication - just remove exact URL duplicates
      const uniqueMedia = extractUniqueMedia(mediaData);
      
      // Limit to maximum 20 unique media items
      const mediaToDownload = uniqueMedia.slice(0, 20);
      
      if (mediaToDownload.length === 0) {
        return extra.reply('❌ Yükləmək üçün etibarlı media tapılmadı. Bu şəxsi yazı ola bilər və ya kazıyıcı uğursuz ola bilər.');
      }
      
      // Download all media silently without status messages
      for (let i = 0; i < mediaToDownload.length; i++) {
        try {
          const media = mediaToDownload[i];
          const mediaUrl = media.url;
          
          // Check if URL ends with common video extensions
          const isVideo = /\.(mp4|mov|avi|mkv|webm)/i.test(mediaUrl) || 
                          mediaUrl.includes('mp4') ||
                          media.type === 'video' || 
                          text.includes('/reel/') || 
                          text.includes('/tv/');
          
          if (isVideo) {
            await sock.sendMessage(chatId, {
              video: { url: mediaUrl },
              mimetype: 'video/mp4',
              caption: `*Yüklədi.. ${(config.botName || 'BOT').toUpperCase()}*`
            }, { quoted: msg });
          } else {
            await sock.sendMessage(chatId, {
              image: { url: mediaUrl },
              caption: `*Yüklədi... ${(config.botName || 'BOT').toUpperCase()}*`
            }, { quoted: msg });
          }
          
          // Add small delay between downloads to prevent rate limiting
          if (i < mediaToDownload.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
        } catch (mediaError) {
          console.error(`Media endirərkən xəta baş verdi ${i + 1}:`, mediaError);
        }
      }
    } catch (error) {
      console.error('Instagram əmrində xəta:', error);
      await extra.reply('❌ Instagram sorğusunu emal edərkən xəta baş verdi. Yenidən cəhd edin.');
    }
  }
};
