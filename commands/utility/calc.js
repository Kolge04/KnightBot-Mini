/**
 * Calculator Command - Perform math calculations
 */

module.exports = {
    name: 'calc',
    aliases: ['calculate', 'math'],
    category: 'utility',
    description: 'Calculate math expressions',
    usage: '.calc <expression>',
    
    async execute(sock, msg, args, extra) {
      try {
        if (args.length === 0) {
          return extra.reply('❌ İstifadə: .calc <ifadə>\n\nMəsələn: .calc 5 + 3 * 2');
        }
        
        const expression = args.join(' ');
        
        // Basic safety check
        if (!/^[0-9+\-*/(). ]+$/.test(expression)) {
          return extra.reply('❌ Yanlış ifadə! Yalnız rəqəmlərə və riyazi simvollara (+, -, *, /, mötərizə) icazə verilir');
        }
        
        try {
          const result = eval(expression);
          
          let text = `🧮 *Kalkulyator*\n\n`;
          text += `📝 Mətn: ${expression}\n`;
          text += `✅ Nəticə: ${result}`;
          
          await extra.reply(text);
        } catch (evalError) {
          await extra.reply('❌ Yanlış riyazi ifadə!');
        }
        
      } catch (error) {
        await extra.reply(`❌ Xəta: ${error.message}`);
      }
    }
  };
  
