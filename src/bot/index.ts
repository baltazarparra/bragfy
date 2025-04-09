import TelegramBot from "node-telegram-bot-api";
import {
  handleStartCommand,
  handleNewChat,
  handleCallbackQuery
} from "./commands";

// Inicializa o agente
export const initBot = (token: string): TelegramBot => {
  // Verifica se o token está vazio (modo de simulação)
  if (!token) {
    console.log("🤖 Bot iniciado em modo de simulação!");
    console.log("⚠️ Nenhum comando será processado automaticamente.");
    console.log("ℹ️ Use o console para simular comandos.");

    // Retorna um objeto com os métodos mínimos necessários
    return {
      onText: () => {},
      on: () => {},
      sendMessage: (chatId: number, text: string) => {
        console.log(`[Simulação] Mensagem enviada para ${chatId}: ${text}`);
        return Promise.resolve({} as any);
      }
    } as any;
  }

  // Cria uma instância do agente com polling habilitado
  const bot = new TelegramBot(token, { polling: true });

  console.log("Agente iniciado!");

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
