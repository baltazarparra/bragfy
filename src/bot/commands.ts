import TelegramBot from "node-telegram-bot-api";
import {
  userExists,
  createUser,
  getUserByTelegramId
} from "../utils/userUtils";
import { createActivity, formatTimestamp } from "../utils/activityUtils";

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
    const messageText = msg.text || "";

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
      return;
    }

    // Repete a mensagem para o usuário e oferece opções
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Confirmar", callback_data: `confirm:${messageText}` },
            { text: "✏️ Editar", callback_data: "edit" },
            { text: "❌ Cancelar", callback_data: "cancel" }
          ]
        ]
      }
    };

    console.log(`Usuário ${telegramUser.id} enviou mensagem: "${messageText}"`);

    bot.sendMessage(
      chatId,
      `Recebi sua atividade:\n\n"${messageText}"\n\nDeseja confirmar, editar ou cancelar?`,
      options
    );
  } catch (error) {
    console.error("Erro ao processar nova mensagem:", error);
  }
};

/**
 * Handler para callbacks de botões inline
 */
export const handleCallbackQuery = async (
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery
) => {
  try {
    if (!callbackQuery.message || !callbackQuery.from) {
      console.error("Dados de callback incompletos");
      return;
    }

    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data || "";
    const telegramUser = callbackQuery.from;

    console.log(`Callback recebido: ${data} do usuário ${telegramUser.id}`);

    // Processa as diferentes ações de callback
    if (data.startsWith("confirm:")) {
      // Extrai o conteúdo da mensagem do callback_data
      const content = data.substring(8);

      // Busca o usuário no banco
      const user = await getUserByTelegramId(telegramUser.id);

      if (!user) {
        bot.sendMessage(chatId, "Erro: Usuário não encontrado.");
        return;
      }

      // Salva a atividade
      const activity = await createActivity(user.id, content);

      // Formata e exibe o timestamp
      const timestamp = formatTimestamp(activity.date);

      // Responde ao usuário
      bot.editMessageText(
        `✅ Atividade registrada com sucesso!\n\nID: ${activity.id}\nData: ${timestamp}\n\nConteúdo:\n"${content}"`,
        {
          chat_id: chatId,
          message_id: messageId
        }
      );

      console.log(`Atividade ${activity.id} criada para o usuário ${user.id}`);
    } else if (data === "edit") {
      bot.editMessageText("✏️ Por favor, envie sua mensagem corrigida.", {
        chat_id: chatId,
        message_id: messageId
      });

      console.log(`Usuário ${telegramUser.id} solicitou edição`);
    } else if (data === "cancel") {
      bot.editMessageText("❌ Registro de atividade cancelado.", {
        chat_id: chatId,
        message_id: messageId
      });

      console.log(`Usuário ${telegramUser.id} cancelou atividade`);
    }

    // Responde ao callback para remover o indicador de carregamento no cliente
    bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Erro ao processar callback:", error);

    if (callbackQuery.message) {
      bot.sendMessage(
        callbackQuery.message.chat.id,
        "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente."
      );
    }
  }
};
