/**
 * AI Chat Command - ChatGPT-style responses
 */

const APIs = require('../../utils/api');

module.exports = {
  name: 'ai',
  aliases: ['gpt', 'chatgpt', 'ask'],
  category: 'ai',
  description: 'Chat with AI (ChatGPT-style)',
  usage: '.ai <question>',
  
  async execute(sock, msg, args, extra) {
    try {
      if (args.length === 0) {
        return extra.reply('❌ Usage: .ai <question>\n\nExample: .ai What is the capital of France?');
      }
      
      const question = args.join(' ');
      const chatId = msg.key.remoteJid; // Hər çatın öz yaddaşı olması üçün ID götürürük
      
      // Yeni yazdığımız funksiyaya həm sualı, həm də çat ID-sini göndəririk
      const answer = await APIs.chatAI(question, chatId);
      
      await extra.reply(answer);
      
    } catch (error) {
      await extra.reply(`❌ AI Error: ${error.message}`);
    }
  }
};
