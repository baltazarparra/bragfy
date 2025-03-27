import TelegramBot from "node-telegram-bot-api";
import {
  userExists,
  createUser,
  getUserByTelegramId
} from "../utils/userUtils";
import {
  createActivity,
  formatTimestamp,
  getActivitiesByPeriod
} from "../utils/activityUtils";
import { Activity } from ".prisma/client";

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
      console.warn(`Mensagem recebida sem dados do usuário no chat ${chatId}`);
      bot.sendMessage(
        chatId,
        "Não foi possível obter suas informações. Por favor, use o comando /start para começar."
      );
      return;
    }

    // Verifica se o usuário já existe
    const exists = await userExists(telegramUser.id);

    if (!exists) {
      // Usuário não existe no banco de dados, mesmo após /start
      console.warn(
        `Usuário ${telegramUser.id} (${telegramUser.first_name}) tentou enviar mensagem mas não está cadastrado no banco`
      );

      bot.sendMessage(
        chatId,
        `Opa! Parece que tivemos um problema ao registrar sua atividade.\nPor favor, envie o comando /start novamente para que tudo funcione direitinho 🙏`
      );
      return;
    }

    // Busca o usuário para garantir que ele existe antes de prosseguir
    const user = await getUserByTelegramId(telegramUser.id);

    if (!user) {
      console.warn(
        `Usuário ${telegramUser.id} existe segundo userExists() mas não foi encontrado por getUserByTelegramId()`
      );

      bot.sendMessage(
        chatId,
        `Opa! Parece que tivemos um problema ao registrar sua atividade.\nPor favor, envie o comando /start novamente para que tudo funcione direitinho 🙏`
      );
      return;
    }

    // Verificar se é uma solicitação de brag document
    const msgLower = messageText.toLowerCase().trim();
    const isBragRequest =
      msgLower === "/brag" ||
      msgLower === "/bragfy" ||
      msgLower === "bragfy" ||
      msgLower.includes("gerar brag") ||
      msgLower.includes("gerar documento") ||
      msgLower.includes("gerar pdf") ||
      msgLower.includes("gerar relatorio");

    if (isBragRequest) {
      console.log(
        `Usuário ${telegramUser.id} solicitou geração de Brag Document`
      );

      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🟢 Atividades de hoje", callback_data: "brag:1" }],
            [{ text: "🔵 Últimos 7 dias", callback_data: "brag:7" }],
            [{ text: "🟣 Últimos 30 dias", callback_data: "brag:30" }]
          ]
        }
      };

      bot.sendMessage(
        chatId,
        "Vamos gerar seu Brag Document! Escolha o período desejado:",
        options
      );
      return;
    }

    // Continua com o fluxo normal de registro de atividade
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

    // Garante que o usuário sempre receba feedback, mesmo em caso de erro
    try {
      bot.sendMessage(
        msg.chat.id,
        "Ops! Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou use o comando /start para reiniciar a conversa."
      );
    } catch (sendError) {
      console.error(
        "Erro ao enviar mensagem de erro para o usuário:",
        sendError
      );
    }
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
      console.warn("Dados de callback incompletos, ignorando requisição");
      return;
    }

    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data || "";
    const telegramUser = callbackQuery.from;

    console.log(`Callback recebido: ${data} do usuário ${telegramUser.id}`);

    // Processa as diferentes ações de callback
    if (data.startsWith("brag:")) {
      // Extrai o período solicitado
      const period = parseInt(data.substring(5), 10);

      if (isNaN(period) || ![1, 7, 30].includes(period)) {
        console.warn(`Período inválido recebido: ${data.substring(5)}`);
        bot.answerCallbackQuery(callbackQuery.id, { text: "Período inválido" });
        return;
      }

      // Verifica primeiro se o usuário existe no banco de dados
      const exists = await userExists(telegramUser.id);

      if (!exists) {
        console.warn(
          `Usuário ${telegramUser.id} não existe no banco mas tentou gerar brag document`
        );
        bot.sendMessage(
          chatId,
          `Opa! Parece que tivemos um problema com seu cadastro.\nPor favor, envie o comando /start novamente para que possamos gerar seu documento 🙏`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: cadastro não encontrado"
        });
        return;
      }

      // Busca o usuário no banco
      const user = await getUserByTelegramId(telegramUser.id);

      if (!user) {
        console.warn(
          `Usuário ${telegramUser.id} existe segundo userExists() mas não foi encontrado por getUserByTelegramId()`
        );
        bot.sendMessage(
          chatId,
          `Erro: Usuário não encontrado. Por favor, use o comando /start para reiniciar a conversa.`
        );
        bot.answerCallbackQuery(callbackQuery.id, { text: "Erro no cadastro" });
        return;
      }

      try {
        // Informa ao usuário que o documento está sendo gerado
        bot.editMessageText(
          `⏳ Gerando seu Brag Document para os últimos ${period} dia(s)...`,
          {
            chat_id: chatId,
            message_id: messageId
          }
        );

        // Busca as atividades no período
        const activities = await getActivitiesByPeriod(user.id, period);

        // Verifica se há atividades
        if (activities.length === 0) {
          bot.editMessageText(
            `Hmm, não encontrei nenhuma atividade registrada nos últimos ${period} dia(s).\n\nQue tal registrar algumas conquistas agora?`,
            {
              chat_id: chatId,
              message_id: messageId
            }
          );
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Nenhuma atividade encontrada"
          });
          return;
        }

        // Constrói o cabeçalho do documento
        let bragDocument = `👤 *Nome*: ${user.firstName}`;
        if (user.lastName) bragDocument += ` ${user.lastName}`;
        bragDocument += "\n";

        if (user.username) {
          bragDocument += `📛 *Username*: @${user.username}\n`;
        }

        bragDocument += `🆔 *ID*: ${user.telegramId}\n\n`;

        // Constrói a tabela de atividades
        bragDocument += "| 📅 *Timestamp* | 📝 *Atividade* |\n";
        bragDocument += "|---------------|----------------|\n";

        activities.forEach((activity: Activity) => {
          const timestamp = formatTimestamp(activity.date);
          // Escapa caracteres especiais do Markdown
          const escapedContent = activity.content.replace(
            /([_*[\]()~`>#+\-=|{}.!])/g,
            "\\$1"
          );
          bragDocument += `| ${timestamp} | ${escapedContent} |\n`;
        });

        bragDocument += "\n🔄 _Gerado em " + formatTimestamp(new Date()) + "_";

        // Envia o documento formatado
        bot.editMessageText(bragDocument, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown"
        });

        console.log(
          `Brag Document com ${activities.length} atividades gerado para o usuário ${user.id}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Documento gerado!"
        });
      } catch (error) {
        console.error("Erro ao gerar Brag Document:", error);
        bot.editMessageText(
          "Desculpe, ocorreu um erro ao gerar seu Brag Document. Por favor, tente novamente mais tarde.",
          {
            chat_id: chatId,
            message_id: messageId
          }
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao gerar documento"
        });
      }
    } else if (data.startsWith("confirm:")) {
      // Extrai o conteúdo da mensagem do callback_data
      const content = data.substring(8);

      // Verifica primeiro se o usuário existe no banco de dados
      const exists = await userExists(telegramUser.id);

      if (!exists) {
        console.warn(
          `Usuário ${telegramUser.id} não existe no banco mas tentou confirmar atividade`
        );
        bot.sendMessage(
          chatId,
          `Opa! Parece que tivemos um problema com seu cadastro.\nPor favor, envie o comando /start novamente para que possamos registrar sua atividade 🙏`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: cadastro não encontrado"
        });
        return;
      }

      // Busca o usuário no banco
      const user = await getUserByTelegramId(telegramUser.id);

      if (!user) {
        console.warn(
          `Usuário ${telegramUser.id} existe segundo userExists() mas não foi encontrado por getUserByTelegramId()`
        );
        bot.sendMessage(
          chatId,
          `Erro: Usuário não encontrado. Por favor, use o comando /start para reiniciar a conversa.`
        );
        bot.answerCallbackQuery(callbackQuery.id, { text: "Erro no cadastro" });
        return;
      }

      try {
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

        console.log(
          `Atividade ${activity.id} criada para o usuário ${user.id}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Atividade registrada!"
        });
      } catch (activityError) {
        console.error("Erro ao criar atividade:", activityError);
        bot.sendMessage(
          chatId,
          "Erro ao registrar sua atividade. Por favor, tente novamente."
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao registrar"
        });
      }
    } else if (data === "edit") {
      bot.editMessageText("✏️ Por favor, envie sua mensagem corrigida.", {
        chat_id: chatId,
        message_id: messageId
      });

      console.log(`Usuário ${telegramUser.id} solicitou edição`);
      bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === "cancel") {
      bot.editMessageText("❌ Registro de atividade cancelado.", {
        chat_id: chatId,
        message_id: messageId
      });

      console.log(`Usuário ${telegramUser.id} cancelou atividade`);
      bot.answerCallbackQuery(callbackQuery.id);
    } else {
      console.warn(`Callback desconhecido recebido: ${data}`);
      bot.answerCallbackQuery(callbackQuery.id, { text: "Ação desconhecida" });
    }
  } catch (error) {
    console.error("Erro ao processar callback:", error);

    try {
      if (callbackQuery.message) {
        bot.sendMessage(
          callbackQuery.message.chat.id,
          "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente ou use /start para reiniciar."
        );
      }

      bot.answerCallbackQuery(callbackQuery.id, { text: "Ocorreu um erro" });
    } catch (sendError) {
      console.error("Erro ao enviar resposta de erro:", sendError);
    }
  }
};
