/**
 * TikTok Downloader - Download TikTok videos
 */

const { ttdl } = require('ruhend-scraper');
const axios = require('axios');
const APIs = require('../../utils/api');
const config = require('../../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'tiktok',
  aliases: ['tt'],
  category: 'media',
  description: 'TikTok videolarını yükləyin',
  usage: '.tiktok <TikTok LINK>',
  
  async execute(sock, msg, args) {
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
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: 'Zəhmət olmasa video üçün TikTok linkini təqdim edin.' 
        }, { quoted: msg });
      }
      
      // Extract URL from command
      const url = text.split(' ').slice(1).join(' ').trim();
      
      if (!url) {
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: 'Zəhmət olmasa video üçün TikTok linkini təqdim edin.' 
        }, { quoted: msg });
      }
      
      // Check for various TikTok URL formats
      const tiktokPatterns = [
        /https?:\/\/(?:www\.)?tiktok\.com\//,
        /https?:\/\/(?:vm\.)?tiktok\.com\//,
        /https?:\/\/(?:vt\.)?tiktok\.com\//,
        /https?:\/\/(?:www\.)?tiktok\.com\/@/,
        /https?:\/\/(?:www\.)?tiktok\.com\/t\//
      ];
      
      const isValidUrl = tiktokPatterns.some(pattern => pattern.test(url));
      
      if (!isValidUrl) {
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: 'Bu etibarlı TikTok bağlantısı deyil. Zəhmət olmasa etibarlı TikTok video linki təqdim edin.' 
        }, { quoted: msg });
      }
      
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: '🔎', key: msg.key }
      });
      
      try {
        let videoUrl = null;
        let title = null;
        
        // Use TikWM API - more stable
        try {
          const response = await axios.post('https://www.tikwm.com/api/', { url: url });
          if (response.data && response.data.data) {
             videoUrl = response.data.data.play;
             title = response.data.data.title;
          }
        } catch (apiError) {
          console.error(`TikWM API uğursuz oldu: ${apiError.message}`);
        }
        
        // If Siputzx API didn't work, try ttdl method
        if (!videoUrl) {
          try {
            let downloadData = await ttdl(url);
            if (downloadData && downloadData.data && downloadData.data.length > 0) {
              const mediaData = downloadData.data;
              for (let i = 0; i < Math.min(20, mediaData.length); i++) {
                const media = mediaData[i];
                const mediaUrl = media.url;
                const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || media.type === 'video';
                
                if (isVideo) {
                  await sock.sendMessage(msg.key.remoteJid, {
                    video: { url: mediaUrl },
                    mimetype: 'video/mp4',
                    caption: `*Yüklədi... ${config.botName.toUpperCase()}*`
                  }, { quoted: msg });
                } else {
                  await sock.sendMessage(msg.key.remoteJid, {
                    image: { url: mediaUrl },
                    caption: `*Yüklədi... ${config.botName.toUpperCase()}*`
                  }, { quoted: msg });
                }
              }
              return;
            }
          } catch (ttdlError) {
            console.error('ttdl fallback also failed:', ttdlError.message);
          }
        }
        
        // Send the video if we got a URL
        if (videoUrl) {
          try {
            // Download video as buffer
            const videoResponse = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              maxContentLength: 100 * 1024 * 1024, // 100MB limit
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'video/mp4,video/*,*/*;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://www.tiktok.com/'
              }
            });
            
            const videoBuffer = Buffer.from(videoResponse.data);
            
            if (videoBuffer.length === 0) {
              throw new Error('Video buferi boşdur');
            }
            
            const botName = config.botName.toUpperCase();
            const caption = title ? `*Yüklədi.. ${botName}*\n\n📝 Başlıq: ${title}` : `*Yüklədi.. ${botName}*`;
            
            await sock.sendMessage(msg.key.remoteJid, {
              video: videoBuffer,
              mimetype: 'video/mp4',
              caption: caption
            }, { quoted: msg });
            
            return;
          } catch (downloadError) {
            console.error(`Failed to download video: ${downloadError.message}`);
            // Fallback to URL method
            try {
              const botName = config.botName.toUpperCase();
              const caption = title ? `*Yüklədi.. ${botName}*\n\n📝 Başlıq: ${title}` : `*Yüklədi... ${botName}*`;
              
              await sock.sendMessage(msg.key.remoteJid, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption: caption
              }, { quoted: msg });
              return;
            } catch (urlError) {
              console.error(`URL metodu da uğursuz oldu: ${urlError.message}`);
            }
          }
        }
        
        // If we reach here, no method worked
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ TikTok videosunu endirmək alınmadı. Bütün endirmə üsulları uğursuz oldu. Lütfən, başqa link ilə yenidən cəhd edin.' 
        }, { quoted: msg });
        
      } catch (error) {
        console.error('TikTok yükləməsində xəta:', error);
        await sock.sendMessage(msg.key.remoteJid, { 
          text: 'TikTok videosunu endirmək alınmadı. Lütfən, başqa link ilə yenidən cəhd edin.' 
        }, { quoted: msg });
      }
    } catch (error) {
      console.error('TikTok əmrində xəta:', error);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: 'Sorğunu emal edərkən xəta baş verdi. Lütfən, sonra yenidən cəhd edin.' 
      }, { quoted: msg });
    }
  }
};
