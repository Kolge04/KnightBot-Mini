/**
 * Global Configuration for WhatsApp MD Bot
 */

module.exports = {
    // Bot Owner Configuration
    ownerNumber: ['994775748404'], // Add your number without + or spaces (e.g., 919876543210)
    ownerName: ['Nexus MD ⚡'], // Owner names corresponding to ownerNumber array
    
    // Bot Configuration
    botName: 'Nexus MD ⚡',
    prefix: '.',
    sessionName: 'session',
    sessionID: process.env.SESSION_ID || 'KnightBot!H4sIAAAAAAAAA5VUWbOiOBT+L3nV6ovIIlbdqsEALrgBisvUPCAEiGLAJCDY5X+fwu7b3Q8zPXd4CknqnO98S74CkmOGbNSA4VdQUFwFHLVL3hQIDMGojGNEQRdEAQ/AECQr4eZnDQkQ8hw9gujt7Nnr5i0VsDbrWDwc3TfZSYaumL+DZxcU5SnD4W8KevqIk5p1buexhnbVmMFK3VMo0r7XmOJbaAaqHRHt5NXmO3i2FQNMMUnMIkVXRIPMRs06wPRz8JVJssv03nZlHORYFt26ODLTMMvOw5uLy0u4w7kvK407Jexz8CcNhM780Zv7SWhv4tX2pkV7Lk/dXrbYLJjlufpIqJJ7haVv8BlOCIqmESIc8+bTvA8WNj5gd2Gc+4dOnyuLOjXOxPBJwvqJ/giz8Ujd927HuSV9Dngyt2pYZxkOdgWlXuKUWaW5tgmn65Gx3janvbqJxrdGbqa/Al/TD69c/g/vzjjzH1s4K8rdTWWmvx8L4notqXYxQwvmSXi8M0d7X+Ti4HPw98ItHGwfxnFssHDWb/AYsWARHzxL7TyytXRSe64y2fRz5/ATfsBL+juU+7pKV9BD+yj2/Y09nh/6M7de3Ad+FD9Wj9W5cDankdyMx5NBEezmrNDmoi0+9uOL4ifLw+2hHndn2cKpvCBsqSvF2tGT99dEF9RMIzDsPbuAogQzTgOOc/LaGwy6IIgqD4UU8Re9oImgQC1xFelm3o8HSlFHCld6x8t0hB4MXg7iTU9bpRrhHXRBQfMQMYaiCWY8p80CMRYkiIHhn391AUE1/yZc267f64IYU8a3pCyyPIg+VP04DMIwLwn3GhLCdoEoGAo/txHnmCSs5bEkAQ1TXCGYBpyBYRxkDP2YEFEUgSGnJfqRWphHLfET3YeT+WQDuuD6EgRHYAg0TVJVWZUGkiANRekP9uXelg2K4gtBHHRB9romapImCaraF2RBUduL7f7zB8C2XoR4gDMGhgCuvFC8XpxOQULBORxGUNdtXW9J+xjowxnfmL+qxoFW6ibd2sbV8oxQu8836G7kwszwLWNqY3PmestlBMN/KtJqZ+bpw9pVQoZnR8dq3hIyV7OTyEYqmmpE2VLxLsz1Sc4HAVYmRnmDdb2YrNOSkrdjpSViatH+4oAWknr1rFX/7VTD+3vbLUIVDtGvzbZHWLrWRJF8W5qvCVWz/ExSVy5irwwfac+oiMNgXJd2vVvK12YRmPpsPr0vBqa563jLw1RZr7RlEj3gzr1YZ912K/jds6/MZN/fKvxyUytV+xtj9Io+CVoB/1u6b8BbhwnP7i81vj8m/xLI0bG8i7baESQfJnK6TfrrEAp9pitL6PRcp4F5Crfb82bvEPB8/tUFRRbwOKdXMAQBiWiOI9AFNC9by05JnP+mGdQvUzNJpu3kWcC4/jMGG3xFjAfXAgx76qCnaaIqyF1wbfSi8HjAP9ID9PabOQJ4/g3LxypKWQcAAA==',
    newsletterJid: '120363161513685998@newsletter', // Newsletter JID for menu forwarding
    updateZipUrl: 'https://github.com/Kolge04/KnightBot-Mini/archive/refs/heads/main.zip', // URL to latest code zip for .update command

    MONGODB_URI: "mongodb+srv://TEAMBABY01:UTTAMRATHORE09@cluster0.vmjl9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", // Mango db yaz
    
    // Sticker Configuration
    packname: 'Nexus MD ⚡',
    
    // Oyun ucun yer
    GAME_TIME: '25000', // Oyunda novbeti soze kecid ucin vaxt
    GAME_NEXT: '4',  // Oyun Sonlanma ucun saygac
    
    // Bot Behavior
    selfMode: false, // Private mode - only owner can use commands
    autoRead: false,
    autoTyping: false,
    autoBio: false,
    autoSticker: false,
    autoReact: false,
    autoReactMode: 'bot', // set bot or all via cmd
    autoDownload: false,
    
    // Group Settings Defaults
    defaultGroupSettings: {
      antilink: false,
      antilinkAction: 'delete', // 'delete', 'kick', 'warn'
      antitag: false,
      antitagAction: 'delete',
      antiall: false, // Owner only - blocks all messages from non-admins
      antiviewonce: false,
      antibot: false,
      anticall: false, // Anti-call feature
      antigroupmention: false, // Anti-group mention feature
      antigroupmentionAction: 'delete', // 'delete', 'kick'
      welcome: false,
      welcomeMessage: '╭╼━≪•YENI ÜZV•≫━╾╮\n┃SALAM: @user 👋\n┃User Sayı: #memberCount\n┃ZAMAN: Saat⏰\n╰━━━━━━━━━━━━━━━╯\n\n*@user* Xoş Gəldin *@group*! 🎉\n*Qrup 𝙳𝙴𝚂𝙲𝚁𝙸𝙿𝚃𝙸𝙾𝙽*\ngroupDesc\n\n> *NexusMD ⚡*',
      goodbye: false,
      goodbyeMessage: 'Əlvida @user 👋 Sizin üçün heç vaxt darıxmayacağıq!',
      antiSpam: false,
      antidelete: false,
      nsfw: false,
      detect: false,
      chatbot: false,
      autosticker: false // Auto-convert images/videos to stickers
    },
    
    // API Keys (add your own)
    apiKeys: {
      // Add API keys here if needed
      openai: '',
      deepai: '',
      remove_bg: ''
    },
    
    // Message Configuration
    messages: {
      wait: '⏳ Gözləyin...',
      success: '✅ Uğurlar!',
      error: '❌ Xəta baş verdi!',
      ownerOnly: '👑 Bu əmr yalnız bot sahibi üçündür!',
      adminOnly: '🛡️ Bu əmr yalnız qrup adminləri üçündür!',
      groupOnly: '👥 Bu əmr yalnız qruplarda istifadə edilə bilər!',
      privateOnly: '💬 Bu əmr yalnız şəxsi söhbətdə istifadə edilə bilər!',
      botAdminNeeded: '🤖 Bu əmri yerinə yetirmək üçün botun admin olması lazımdır!',
      invalidCommand: '❓ Yanlış Əmr! Kömək Üçün .menu ve ya .help Yazın.'
    },
    
    // Zaman bolgesi
    timezone: 'Asia/Baku',
    
    // Limits
    maxWarnings: 3,
    
    // Sosiak linkler (optional)
    social: {
      github: 'https://github.com',
      instagram: 'https://instagram.com',
      youtube: 'http://youtube.com/@sesizKOLGE'
    }
};
  
