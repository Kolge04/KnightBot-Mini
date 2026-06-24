// commands/general/myactivity.js

const { getStats } = require('../../utils/groupstats');

module.exports = {
    name: 'mystat',
    aliases: ['myactivity', 'minfo', 'rank'],
    category: 'general',
    description: 'Bu gün üçün fəaliyyət statistikanızı yoxlayın',
    usage: '.myactivity',
    groupOnly: true,

    async execute(sock, msg, args, extra) {
        try {
            const from = extra.from;
            const sender = extra.sender;
            const stats = getStats(from);

            if (!stats || !stats.users || !stats.users[sender]) {
                return extra.reply('📊 Bu gün hələ heç bir mesaj göndərməmisiniz!');
            }

            const userCount = stats.users[sender];
            const totalMessages = stats.total;
            const percentage = ((userCount / totalMessages) * 100).toFixed(1);

            // Calculate rank
            const sortedUsers = Object.entries(stats.users)
                .sort((a, b) => b[1] - a[1]);
            
            const rank = sortedUsers.findIndex(([id]) => id === sender) + 1;

            const text = `
📊 *Bugünkü Fəaliyyətiniz*

👤 *User:* @${sender.split('@')[0]}
📝 *Mesaj sayı:* ${userCount}
📈 *Sizin Paylaşımınız:* ${percentage}%
🏆 *Rütbə:* #${rank} of ${sortedUsers.length}

Söhbətə davam edin! 💬
`.trim();

            await sock.sendMessage(from, {
                text,
                mentions: [sender]
            }, { quoted: msg });

        } catch (err) {
            console.error('[myactivity cmd] error:', err);
            extra.reply('❌ Fəaliyyət statistikanızı yükləyərkən xəta baş verdi.');
        }
    }
};
