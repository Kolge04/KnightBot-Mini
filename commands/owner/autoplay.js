/**
 * AutoPlay Command - Emoji trigger ilə avtomatik musiqi göndər
 * İstifadə: .autoplay on / .autoplay off
 */

const database = require('../../database');
const config = require('../../config');


module.exports = {
  name: 'autoplay',
  aliases: ['autoplayer', 'ap'],
  category: 'owner',
  description: '🎵 emoji yazıldıqda avtomatik musiqi göndər',
  usage: '.autoplay on/off',
  adminOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const { from } = extra;

      if (!args[0]) {
        const groupSettings = database.getGroupSettings(from);
        const status = groupSettings.autoplay ? '✅ Aktiv' : '❌ Deaktiv';
        return extra.reply(
          `🎵 *AutoPlay Status:* ${status}\n\n` +
          `İstifadə:\n` +
          `• *.autoplay on* — Aktivləşdir\n` +
          `• *.autoplay off* — Söndür\n\n` +
          `> Qrupda kimsə ${config.Autoply} yazanda bot avtomatik random musiqi göndərəcək.`
        );
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        database.updateGroupSettings(from, { autoplay: true });
        return extra.reply('✅ *AutoPlay aktiv edildi!*\n\n🎵 yazın — bot avtomatik musiqi göndərəcək!');
      }

      if (opt === 'off') {
        database.updateGroupSettings(from, { autoplay: false });
        return extra.reply('❌ *AutoPlay söndürüldü.*');
      }

      extra.reply('❌ Yanlış seçim. İstifadə: `.autoplay on` ya da `.autoplay off`');
    } catch (err) {
      console.error('[autoplay cmd] xəta:', err);
      extra.reply('❌ Xəta baş verdi.');
    }
  }
};
