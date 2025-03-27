import TelegramBot from "node-telegram-bot-api";
import {
  handleStartCommand,
  handleNewChat,
  handleCallbackQuery
} from "./commands";

// Inicializa o bot
export const initBot = (token: string): TelegramBot => {
  // Cria uma instância do bot com polling habilitado
  const bot = new TelegramBot(token, { polling: true });

  console.log("Bot iniciado!");

  // Registra handler para o comando /start com parâmetro opcional
  bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
    const source = match ? match[1] : undefined;
    handleStartCommand(bot, msg, source);
  });

  // Registra handler para todas as mensagens
  bot.on("message", (msg) => {
    // Ignora comandos
    if (msg.text && msg.text.startsWith("/")) return;

    // Processa nova mensagem
    handleNewChat(bot, msg);
  });

  // Registra handler para callbacks de botões inline
  bot.on("callback_query", (query) => {
    handleCallbackQuery(bot, query);
  });

  // Trata erros
  bot.on("polling_error", (err) => {
    console.error("Erro de polling:", err);
  });

  return bot;
};
