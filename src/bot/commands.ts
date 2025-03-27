import TelegramBot from "node-telegram-bot-api";
import { userExists, createUser } from "../utils/userUtils";

/**
 * Mapeia fontes de tráfego para mensagens personalizadas
 */
const sourceMessages: Record<string, string> = {
  landing: "página de destino",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter"
};

/**
 * Handler para o comando /start
 */
export const handleStartCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  source?: string
) => {
  try {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;

    // Loga a fonte de tráfego, se existir
    if (source) {
      console.log(
        `Usuário com id ${chatId} acessou através da fonte: ${source}`
      );
    }

    if (!telegramUser) {
      bot.sendMessage(
        chatId,
        "Não foi possível obter suas informações. Por favor, tente novamente."
      );
      return;
    }

    // Verifica se o usuário já existe
    const exists = await userExists(telegramUser.id);

    if (exists) {
      // Usuário já cadastrado - mantém a mensagem padrão de reentrada
      bot.sendMessage(
        chatId,
        `Olá novamente, ${telegramUser.first_name}! Você já está cadastrado no Bragfy.`
      );
    } else {
      // Novo usuário, vamos cadastrar
      await createUser(telegramUser);

      // Cria mensagem personalizada baseada na fonte, se disponível
      let welcomeMessage = `Olá, ${telegramUser.first_name}! Bem-vindo ao Bragfy! 🚀\n\n`;

      if (source && sourceMessages[source]) {
        welcomeMessage += `Vejo que você veio da nossa *${sourceMessages[source]}*. Que bom que nos encontrou!\n\n`;
      }

      welcomeMessage +=
        "Estou aqui para ajudar você a registrar suas conquistas profissionais e gerar um Brag Document em PDF facilmente.";

      // Envia mensagem de boas-vindas personalizada
      bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error("Erro ao processar comando /start:", error);
    bot.sendMessage(
      msg.chat.id,
      "Ocorreu um erro ao processar seu comando. Por favor, tente novamente mais tarde."
    );
  }
};

/**
 * Handler para novas mensagens de chat
 */
export const handleNewChat = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  try {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;

    if (!telegramUser) {
      bot.sendMessage(
        chatId,
        "Não foi possível obter suas informações. Por favor, use o comando /start para começar."
      );
      return;
    }

    // Verifica se o usuário já existe
    const exists = await userExists(telegramUser.id);

    if (!exists) {
      // Novo usuário, pede para usar /start
      bot.sendMessage(
        chatId,
        `Olá, ${telegramUser.first_name}! Parece que é sua primeira vez aqui.\n\n` +
          "Por favor, use o comando /start para se cadastrar no Bragfy."
      );
    }
  } catch (error) {
    console.error("Erro ao processar nova mensagem:", error);
  }
};
