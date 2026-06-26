/**
 * Set Prefix Command - Change bot command prefix
 */

const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  category: 'owner',
  description: 'Change bot command prefix',
  usage: '.setprefix <new prefix>',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    try {
      if (args.length === 0) {
        return extra.reply(`📌 Cari prefiks: ${config.prefix}\n\nUsage: .setprefix <new prefix>`);
      }
      
      const newPrefix = args[0];
      
      if (newPrefix.length > 3) {
        return extra.reply('❌ Prefiks 1-3 simvol uzunluğunda olmalıdır!');
      }
      
      // Update config
      config.prefix = newPrefix;
      
      // Update config file
      const configPath = path.join(__dirname, '../../config.js');
      let configContent = fs.readFileSync(configPath, 'utf-8');
      configContent = configContent.replace(/prefix: '.*'/, `prefix: '${newPrefix}'`);
      fs.writeFileSync(configPath, configContent);
      
      await extra.reply(`✅ Prefiks olaraq dəyişdirildi: ${newPrefix}\n\nYeni əmr formatı: ${newPrefix}command`);
      
    } catch (error) {
      await extra.reply(`❌ Xəta: ${error.message}`);
    }
  }
};
