import TelegramBot from "node-telegram-bot-api";

/**
 * Manipula o comando /start
 * Envia uma mensagem de boas-vindas e instruções iniciais
 *
 * @param bot Instância do bot do Telegram
 * @param msg Mensagem recebida
 */
export async function handleStart(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;

  // Mensagem de boas-vindas
  const welcomeMessage = `
👋 Bem-vindo ao Bragfy.

Tudo o que você mandar por aqui será registrado como uma atividade.

📝 <b>Como usar:</b>
- Envie qualquer mensagem para registrar uma atividade
- Adicione horários (como "às 10h" ou "14:30") para especificar quando ocorreu
- Use /brag para gerar seu documento de atividades

Pronto para começar? Basta enviar sua primeira atividade!
  `;

  await bot.sendMessage(chatId, welcomeMessage, { parse_mode: "HTML" });
}
