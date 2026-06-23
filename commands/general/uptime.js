/**
 * Uptime Command - Display bot uptime since it was started
 */

const config = require('../../config');

/**
 * Format time difference into human-readable string
 * @param {number} seconds - Total seconds of uptime
 * @returns {string} Formatted uptime string
 */
function formatUptime(seconds) {
  if (seconds <= 0) {
    return '0 seconds';
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'gün'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'saat'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'dəqiqə'}`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs} ${secs === 1 ? 'second' : 'saniyə'}`);
  }
  
  return parts.join(', ');
}

module.exports = {
  name: 'alive',
  aliases: ['runtime', 'botuptime', 'uptime'],
  category: 'general',
  description: 'Show how long the bot has been running',
  usage: '.alive',
  
  async execute(sock, msg, args, extra) {
    try {
      // Get process uptime in seconds
      const uptimeSeconds = process.uptime();
      const uptime = formatUptime(uptimeSeconds);
      
// Get bot info
const botName = config.botName || 'Bot';
const botVersion = 'V1.0.2';
      
      // Build response message
      let message = `╭━━『 *Bot Işləyir* 』━━╮\n\n`;
    message += `🤖 *Bot Adı:* ${botName}\n`;
    message += `🧬 *Bot Version:* ${botVersion}\n`;
      message += `⏱️ *İşləyir:* ${uptime}\n`;
      message += `\n╰━━━━━━━━━━━━━━━╯`;
      
      await extra.reply(message);
      
    } catch (error) {
      console.error('Error in uptime command:', error);
      await extra.reply('❌ An error occurred while fetching uptime information. Please try again later.');
    }
  }
};

