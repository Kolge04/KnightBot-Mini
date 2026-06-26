/**
 * Welcome - Enable/disable welcome messages
 */

const db = require('../../database');

module.exports = {
  name: 'welcome',
  aliases: ['welcomeon', 'welcomeoff'],
  category: 'admin',
  desc: 'Enable/disable welcome messages',
  usage: 'welcome on/off',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  execute: async (sock, msg, args) => {
    try {
      const groupId = msg.key.remoteJid;
      const action = args[0]?.toLowerCase();
      
      if (!action || !['on', 'off'].includes(action)) {
        const groupSettings = db.getGroupSettings(groupId);
        const status = groupSettings.welcome ? '✅ Aktivdir' : '❌ Bağlıdır';
        return await sock.sendMessage(groupId, {
          text: `👋 *Xoş gəlmisiniz Mesajları*\n\nStatus: ${status}\nMessage: ${groupSettings.welcomeMessage}\n\nİstifadə: .welcome on/off\n\nFərdiləşdirmək üçün: .setwelcome <message>`
        }, { quoted: msg });
      }
      
      const enable = action === 'on';
      db.updateGroupSettings(groupId, { welcome: enable });
      
      await sock.sendMessage(groupId, {
        text: `✅ Salamlama mesajları ${enable ? 'aktivləşdirildi' : 'Bağlıdır'}!${enable ? '\n\nYeni üzvlər indi salamlama mesajları alacaqlar.' : ''}`
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Welcome Error:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Xəta: ${error.message}`
      }, { quoted: msg });
    }
  }
};
