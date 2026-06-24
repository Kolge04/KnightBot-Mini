/**
 * Ping Command - Check bot response time
 */

module.exports = {
    name: 'ping',
    aliases: ['p'],
    category: 'general',
    description: 'Check bot response time',
    usage: '.ping',
    
    async execute(sock, msg, args, extra) {
      try {
        const start = Date.now();
        const sent = await extra.reply('🏓 Pinq...');
        const end = Date.now();
        
        const responseTime = end - start;
        
        await sock.sendMessage(extra.from, {
          text: `🏓 *Ping!*\n⚡ Cavab vaxtı: ${responseTime}ms`,
          edit: sent.key
        });
        
      } catch (error) {
        await extra.reply(`❌ Xəta: ${error.message}`);
      }
    }
  };
  
