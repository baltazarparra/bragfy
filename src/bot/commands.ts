import TelegramBot from "node-telegram-bot-api";
import {
  userExists,
  createUser,
  getUserByTelegramId
} from "../utils/userUtils";
import {
  createActivity,
  formatTimestamp,
  getActivitiesByPeriod,
  formatUrgencyLabel,
  formatImpactLabel
} from "../utils/activityUtils";
import { generateBragDocumentPDF } from "../utils/pdfUtils";
import {
  getRandomStickerFor,
  sendStickerSafely,
  InteractionType,
  INTERACTION_TYPE_MAP
} from "../utils/stickerUtils";
import { Activity } from "../db/client";
import { isPdfRequest, isBragTextRequest } from "../utils/nluUtils";

// Armazena temporariamente as atividades pendentes de confirmação completa
interface PendingActivityData {
  userId: number;
  content: string;
  activityId?: number; // Preenchido após a criação da atividade
  urgency?: string;
  impact?: string;
}

// Mapeia IDs de mensagem para atividades pendentes
export const pendingActivities = new Map<number, PendingActivityData>();

// Mapeia IDs de usuários para status de fixação de mensagem de instruções
export const pinnedInstructionsStatus = new Map<number, boolean>();

// Mapeia IDs de usuários para status de onboarding em andamento
export const onboardingInProgress = new Map<number, boolean>();

/**
 * Função para enviar um sticker aleatório para uma determinada interação
 * @param bot - Instância do agente do Telegram
 * @param chatId - ID do chat para enviar o sticker
 * @param interaction - Nome da interação (onboarding, new_activity, brag_document)
 */
export async function sendRandomSticker(
  bot: TelegramBot,
  chatId: number,
  interaction: "onboarding" | "new_activity" | "brag_document"
): Promise<void> {
  try {
    await sendStickerSafely(bot, chatId, interaction);
  } catch (error) {
    console.warn(
      `[STICKER] Erro ao enviar sticker aleatorio para interação "${interaction}" no chat ${chatId}:`,
      error
    );
  }
}

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

    // Marca que o onboarding está em andamento para este usuário
    onboardingInProgress.set(telegramUser.id, true);
    console.log(`Iniciando onboarding para usuário ${telegramUser.id}`);

    // Verifica se o usuário já existe
    const exists = await userExists(telegramUser.id);

    if (exists) {
      // Usuário já cadastrado - mantém a mensagem padrão de reentrada
      // Envia um sticker de onboarding
      await sendStickerSafely(bot, chatId, "onboarding");

      await bot.sendMessage(
        chatId,
        `Olá novamente, ${telegramUser.first_name}! Você já está cadastrado no Bragfy.`
      );

      // Envia e fixa a mensagem de instruções para relembrar o usuário
      await sendAndPinInstructions(bot, chatId, telegramUser.id);

      // Finaliza o onboarding para usuários existentes
      onboardingInProgress.delete(telegramUser.id);
      console.log(
        `Onboarding finalizado para usuário existente ${telegramUser.id}`
      );
    } else {
      try {
        // Novo usuário, vamos cadastrar
        console.log(`Criando novo usuário com ID ${telegramUser.id}`);
        await createUser(telegramUser);
        console.log(`Usuário ${telegramUser.id} criado com sucesso`);

        // Nome do usuário com fallback para "usuário" se não disponível
        const userName = telegramUser.first_name || "usuário";

        // Nova mensagem de boas-vindas seguindo o template solicitado
        const welcomeMessage = `Olá *${userName}*, boas vindas ao *Bragfy*,  
seu agente pessoal para gestão de Brag Documents`;

        // Envia um sticker de onboarding
        await sendStickerSafely(bot, chatId, "onboarding");

        // Envia mensagem de boas-vindas personalizada
        await bot.sendMessage(chatId, welcomeMessage, {
          parse_mode: "Markdown"
        });
        console.log(
          `Mensagem de boas-vindas enviada para usuário ${telegramUser.id}`
        );

        // Envia e fixa a mensagem de instruções após o onboarding
        await sendAndPinInstructions(bot, chatId, telegramUser.id);

        // Finaliza o processo de onboarding
        onboardingInProgress.delete(telegramUser.id);
        console.log(
          `Onboarding finalizado com sucesso para usuário ${telegramUser.id}`
        );
      } catch (createError) {
        console.error(`Erro ao criar usuário ${telegramUser.id}:`, createError);
        console.error("Stack trace:", (createError as Error).stack);
        onboardingInProgress.delete(telegramUser.id);
        bot.sendMessage(
          chatId,
          "Ocorreu um erro ao finalizar seu cadastro. Por favor, tente novamente com /start."
        );
      }
    }
  } catch (error) {
    console.error("Erro ao processar comando /start:", error);
    console.error("Stack trace:", (error as Error).stack);

    // Garante que o status de onboarding é limpo em caso de erro
    if (msg.from) {
      onboardingInProgress.delete(msg.from.id);
    }

    bot.sendMessage(
      msg.chat.id,
      "Ocorreu um erro ao processar seu comando. Por favor, tente novamente mais tarde."
    );
  }
};

/**
 * Envia e fixa uma mensagem de instruções no chat
 */
async function sendAndPinInstructions(
  bot: TelegramBot,
  chatId: number,
  telegramUserId: number
): Promise<void> {
  try {
    // Verifica se já fixamos uma mensagem para este usuário
    if (pinnedInstructionsStatus.get(telegramUserId)) {
      console.log(
        `Instruções já fixadas para o usuário ${telegramUserId}, pulando etapa`
      );
      return;
    }

    const instructionsMessage = `*COMO USAR*:

• Para registrar uma atividade, basta enviar uma mensagem nesse chat e ela será registrada  

• Para gerar seu Brag Document, você pode digitar: "*gerar brag*" ou se quiser uma versão em PDF você pode digitar "*gerar PDF*"`;

    // Envia a mensagem de instruções
    const sentMsg = await bot.sendMessage(chatId, instructionsMessage, {
      parse_mode: "Markdown"
    });
    console.log(
      `Mensagem de instruções enviada para usuário ${telegramUserId}`
    );

    // Fixa a mensagem sem notificação (disable_notification = true)
    try {
      await bot.pinChatMessage(chatId, sentMsg.message_id, {
        disable_notification: true
      });
      console.log(
        `Mensagem de instruções fixada para usuário ${telegramUserId}`
      );
    } catch (pinError) {
      // Sempre registra o erro no console para que os testes possam verificar
      console.error(
        `Erro ao fixar mensagem de instruções para usuário ${telegramUserId}:`,
        pinError
      );
      console.error("Stack trace:", (pinError as Error).stack);
    }

    // Marca que já fixamos uma mensagem para este usuário
    pinnedInstructionsStatus.set(telegramUserId, true);
  } catch (error) {
    console.error(
      `Erro ao fixar mensagem de instruções para usuário ${telegramUserId}:`,
      error
    );
    console.error("Stack trace:", (error as Error).stack);
    // Não propagamos o erro para não interromper o fluxo principal
  }
}

/**
 * Handler para novas mensagens recebidas
 */
export const handleNewChat = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  try {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;
    const messageText = msg.text || "";

    // Ignora mensagens enviadas pelo próprio agente
    if (msg.from?.is_bot) {
      console.log(
        `Ignorando mensagem do próprio agente no chat ${msg.chat.id}`
      );
      return;
    }

    if (!telegramUser) {
      console.warn(`Mensagem recebida sem dados do usuário no chat ${chatId}`);
      bot.sendMessage(
        chatId,
        "Não foi possível obter suas informações. Por favor, use o comando /start para começar."
      );
      return;
    }

    // Verifica se o onboarding está em andamento para este usuário
    const isOnboarding = onboardingInProgress.get(telegramUser.id);
    if (isOnboarding) {
      console.log(
        `Ignorando mensagem de usuário ${telegramUser.id} pois o onboarding está em andamento`
      );
      await bot.sendMessage(
        chatId,
        `Estamos finalizando seu cadastro. Por favor, aguarde um momento antes de enviar mensagens.`
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
        `Erro: Usuário não encontrado. Por favor, use o comando /start para reiniciar a conversa.`
      );
      return;
    }

    // Verificação usando NLU para pedidos de PDF
    const msgLower = messageText.toLowerCase().trim();

    // Mantém compatibilidade com comandos diretos como "/brag"
    const isDirectCommand =
      msgLower === "/brag" || msgLower === "/bragfy" || msgLower === "bragfy";

    // Usa NLU para detectar solicitação de PDF
    const isPdfRequestResult = await isPdfRequest(messageText);

    // Usa NLU para detectar solicitação de Brag Document
    const isBragRequestResult = await isBragTextRequest(messageText);

    const isBragRequest = isDirectCommand || isBragRequestResult;

    if (isBragRequest || isPdfRequestResult) {
      console.log(
        `Usuário ${telegramUser.id} solicitou geração de documento com a mensagem: "${messageText}"`
      );

      if (isPdfRequestResult) {
        console.log(
          `[NLU] Usuário ${telegramUser.id} solicitou PDF diretamente`
        );

        // Mostra opções de período para seleção
        const options = {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Hoje", callback_data: "pdf:1" }],
              [{ text: "Últimos 7 dias", callback_data: "pdf:7" }],
              [{ text: "Últimos 30 dias", callback_data: "pdf:30" }]
            ]
          }
        };

        bot.sendMessage(
          chatId,
          "Para qual período você deseja gerar o PDF do seu Brag Document?",
          options
        );

        return;
      }

      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Atividades de hoje", callback_data: "brag:1" }],
            [{ text: "Últimos 7 dias", callback_data: "brag:7" }],
            [{ text: "Últimos 30 dias", callback_data: "brag:30" }]
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
      console.log(
        `[DEBUG] Iniciando processamento de callback brag:X para usuário ${telegramUser.id}`
      );
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
        console.log(
          `[DEBUG] Enviando mensagem "Gerando..." para usuário ${telegramUser.id}`
        );
        await bot.editMessageText(
          `⏳ Gerando seu Brag Document para os últimos ${period} dia(s)...`,
          {
            chat_id: chatId,
            message_id: messageId
          }
        );

        // Busca as atividades no período
        console.log(
          `[DEBUG] Chamando getActivitiesByPeriod(${user.id}, ${period}) para usuário ${telegramUser.id}`
        );
        const activities = await getActivitiesByPeriod(user.id, period);
        console.log(
          `[DEBUG] getActivitiesByPeriod retornou ${activities.length} atividades para usuário ${telegramUser.id}`
        );

        // Verifica se há atividades
        if (activities.length === 0) {
          console.log(
            `[DEBUG] Nenhuma atividade encontrada para usuário ${telegramUser.id}`
          );
          await bot.editMessageText(
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

        // Constrói o documento no estilo Apple: minimalista, elegante e organizado
        let bragDocument = `*BRAG DOCUMENT*\n`;

        // Seção de informações do usuário com espaçamento melhorado e hierarquia visual
        bragDocument += `\n*${user.firstName}${user.lastName ? " " + user.lastName : ""}*`;

        // Divider sutil
        bragDocument += `\n\n―――――――――――――\n`;

        // Cabeçalho de atividades - transformado em um título em vez de tabela
        bragDocument += `\n*ATIVIDADES*\n`;

        // Itera através das atividades com formato mais limpo
        for (let i = 0; i < activities.length; i++) {
          const activity = activities[i];
          try {
            const timestamp = formatTimestamp(activity.createdAt);
            // Escapa caracteres especiais do Markdown
            const escapedContent = activity.content.replace(
              /([_*[\]()~`>#+\-=|{}.!])/g,
              "\\$1"
            );

            // Formato refinado para cada atividade: timestamp em itálico e conteúdo em nova linha
            bragDocument += `\n_${timestamp}_\n${escapedContent}\n`;

            // Adiciona urgência e impacto, se disponíveis
            if (activity.urgency) {
              bragDocument += `• Urgência: ${formatUrgencyLabel(activity.urgency)}\n`;
            }

            if (activity.impact) {
              bragDocument += `• Impacto: ${formatImpactLabel(activity.impact)}\n`;
            }

            // Adiciona uma linha divisória sutil entre atividades, exceto após a última
            if (i < activities.length - 1) {
              bragDocument += `\n· · · · · · · · · ·\n`;
            }
          } catch (activityError) {
            console.error(
              `[ERROR] Erro ao processar atividade ${i}:`,
              activityError
            );
            bragDocument += `\n_Erro: Não foi possível formatar esta atividade_\n`;
          }
        }

        // Rodapé minimalista
        bragDocument += `\n\n―――――――――――――\n`;
        bragDocument += `\n_Documento gerado em ${formatTimestamp(new Date())}_`;

        console.log(
          `[DEBUG] Documento gerado com sucesso para usuário ${telegramUser.id}, enviando resposta`
        );

        // Log simplificado do documento para debug (apenas primeiros caracteres)
        const docPreview = bragDocument.substring(0, 100) + "...";
        console.log(`[DEBUG] Documento gerado (preview): ${docPreview}`);

        try {
          // Adiciona botão para gerar PDF
          const inlineKeyboard = {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🧾 Gerar PDF", callback_data: `pdf:${period}` }]
              ]
            }
          };

          // Envia o documento formatado com botão de PDF
          await bot.editMessageText(bragDocument, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "Markdown",
            reply_markup: inlineKeyboard.reply_markup
          });

          // Envia um sticker para brag document
          await sendStickerSafely(bot, chatId, "brag");

          console.log(
            `Brag Document com ${activities.length} atividades gerado para o usuário ${user.id}`
          );
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Documento gerado!"
          });
        } catch (markdownError) {
          console.error("[ERROR] Erro ao renderizar Markdown:", markdownError);

          // Tenta novamente sem formatação Markdown
          await bot.editMessageText(
            "Seu Brag Document foi gerado, mas ocorreu um erro de formatação. Mostrando versão simplificada...\n\n" +
              bragDocument.replace(/[*_|]/g, ""),
            {
              chat_id: chatId,
              message_id: messageId
            }
          );

          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Documento gerado com limitações"
          });
        }
      } catch (error) {
        console.error("[ERROR] Erro ao gerar Brag Document:", error);
        try {
          await bot.editMessageText(
            "Desculpe, ocorreu um erro ao gerar seu Brag Document. Por favor, tente novamente mais tarde.",
            {
              chat_id: chatId,
              message_id: messageId
            }
          );
        } catch (sendError) {
          console.error("[ERROR] Erro ao enviar mensagem de erro:", sendError);
          // Tenta com mensagem mais simples
          await bot.sendMessage(
            chatId,
            "Erro ao gerar Brag Document. Por favor, tente novamente."
          );
        }

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao gerar documento"
        });
      }
    } else if (data.startsWith("pdf:")) {
      // Callback para geração de PDF
      console.log(
        `[DEBUG] Processando callback pdf:X para usuário ${telegramUser.id}`
      );

      // Extrai o período solicitado
      const period = parseInt(data.substring(4), 10);

      if (isNaN(period) || ![1, 7, 30].includes(period)) {
        console.warn(`Período inválido para PDF: ${data.substring(4)}`);
        bot.answerCallbackQuery(callbackQuery.id, { text: "Período inválido" });
        return;
      }

      // Verifica se o usuário existe
      const exists = await userExists(telegramUser.id);
      if (!exists) {
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: usuário não encontrado",
          show_alert: true
        });
        return;
      }

      // Busca o usuário no banco
      const user = await getUserByTelegramId(telegramUser.id);
      if (!user) {
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro no cadastro, tente novamente",
          show_alert: true
        });
        return;
      }

      // Responde ao callback imediatamente para não deixar o usuário esperando
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Iniciando geração do PDF...",
        show_alert: false
      });

      // Envia mensagem solicitando o PDF
      await bot.sendMessage(chatId, `🧾 Gerando PDF do seu Brag Document...`);

      try {
        // Busca as atividades e gera o PDF
        await generateAndSendPDF(bot, user, period, chatId);
      } catch (error) {
        console.error("[ERROR] Erro ao gerar/enviar PDF:", error);
        bot.sendMessage(
          chatId,
          "Ocorreu um erro ao gerar seu PDF. Por favor, tente novamente mais tarde."
        );
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
        // Inicia o fluxo perguntando sobre a urgência
        // Armazena a atividade pendente no mapa
        pendingActivities.set(messageId, {
          userId: user.id,
          content: content
        });

        // Opções de urgência
        const urgencyOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Alta", callback_data: `urgency:high:${messageId}` },
                {
                  text: "Média",
                  callback_data: `urgency:medium:${messageId}`
                },
                { text: "Baixa", callback_data: `urgency:low:${messageId}` }
              ]
            ]
          }
        };

        // Envia nova mensagem perguntando sobre a urgência
        await bot.sendMessage(
          chatId,
          `Qual é a urgência desta atividade?\n\n"${content}"`,
          urgencyOptions
        );

        // Responde ao callback original
        console.log(
          `Pedindo urgência para atividade "${content}" do usuário ${user.id}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Selecione a urgência"
        });
      } catch (activityError) {
        console.error("Erro ao iniciar processo de atividade:", activityError);
        bot.sendMessage(
          chatId,
          "Erro ao processar sua atividade. Por favor, tente novamente."
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao processar"
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
    } else if (data.startsWith("urgency:")) {
      // Processar seleção de urgência
      // Formato do callback: urgency:VALOR:MESSAGE_ID
      const [, urgencyValue, pendingMessageIdStr] = data.split(":");
      const pendingMessageId = parseInt(pendingMessageIdStr, 10);

      if (isNaN(pendingMessageId) || !pendingActivities.has(pendingMessageId)) {
        console.warn(
          `Atividade pendente não encontrada para urgência: ${pendingMessageId}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: atividade não encontrada"
        });
        return;
      }

      // Recupera a atividade pendente
      const pendingActivity = pendingActivities.get(pendingMessageId)!;

      // Atualiza a urgência
      pendingActivity.urgency = urgencyValue;
      pendingActivities.set(pendingMessageId, pendingActivity);

      try {
        // Agora pergunta sobre o impacto
        const impactOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Alto",
                  callback_data: `impact:high:${pendingMessageId}`
                },
                {
                  text: "Médio",
                  callback_data: `impact:medium:${pendingMessageId}`
                },
                {
                  text: "Baixo",
                  callback_data: `impact:low:${pendingMessageId}`
                }
              ]
            ]
          }
        };

        // Envia nova mensagem perguntando sobre o impacto
        await bot.sendMessage(
          chatId,
          `Qual é o impacto desta atividade?\n\n"${pendingActivity.content}"\n\nUrgência: ${formatUrgencyLabel(urgencyValue)}`,
          impactOptions
        );

        console.log(
          `Pedindo impacto para atividade "${pendingActivity.content}" com urgência "${urgencyValue}" do usuário ${pendingActivity.userId}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Urgência registrada. Agora selecione o impacto."
        });
      } catch (error) {
        console.error("Erro ao processar seleção de urgência:", error);
        bot.sendMessage(
          chatId,
          "Erro ao processar sua seleção. Por favor, tente novamente."
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao processar"
        });
      }
    } else if (data.startsWith("impact:")) {
      // Processar seleção de impacto
      // Formato do callback: impact:VALOR:MESSAGE_ID
      const [, impactValue, pendingMessageIdStr] = data.split(":");
      const pendingMessageId = parseInt(pendingMessageIdStr, 10);

      if (isNaN(pendingMessageId) || !pendingActivities.has(pendingMessageId)) {
        console.warn(
          `Atividade pendente não encontrada para impacto: ${pendingMessageId}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: atividade não encontrada"
        });
        return;
      }

      // Recupera a atividade pendente
      const pendingActivity = pendingActivities.get(pendingMessageId)!;

      // Atualiza o impacto
      pendingActivity.impact = impactValue;
      pendingActivities.set(pendingMessageId, pendingActivity);

      try {
        // Nova etapa: mostrar confirmação de urgência e impacto antes de salvar
        const confirmOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Confirmar",
                  callback_data: `save_activity:${pendingMessageId}`
                },
                {
                  text: "✏️ Editar",
                  callback_data: `edit_activity:${pendingMessageId}`
                }
              ]
            ]
          }
        };

        // Envia mensagem de confirmação com resumo da atividade
        await bot.sendMessage(
          chatId,
          `Confira os detalhes da sua atividade:\n\n"${pendingActivity.content}"\n\n• Urgência: ${formatUrgencyLabel(pendingActivity.urgency || "medium")}\n• Impacto: ${formatImpactLabel(pendingActivity.impact || "medium")}\n\nDeseja confirmar ou editar?`,
          confirmOptions
        );

        console.log(
          `Solicitando confirmação para atividade "${pendingActivity.content}" (ID msg: ${pendingMessageId})`
        );

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Confira os detalhes e confirme"
        });
      } catch (error) {
        console.error("Erro ao processar seleção de impacto:", error);
        bot.sendMessage(
          chatId,
          "Erro ao processar sua seleção. Por favor, tente novamente."
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao processar"
        });
      }
    } else if (data.startsWith("save_activity:")) {
      // Processar salvamento final da atividade
      // Formato do callback: save_activity:MESSAGE_ID
      console.log(`Recebido save_activity com dados: ${data}`);

      // Extrair o ID da mensagem de forma consistente com o handler principal
      let pendingMessageId;
      try {
        const parts = data.split(":");
        if (parts.length === 2 && parts[0] === "save_activity") {
          pendingMessageId = parseInt(parts[1], 10);
        } else {
          console.warn(`Formato inválido para save_activity: ${data}`);
          return;
        }
      } catch (error) {
        console.error(`Erro ao extrair ID da mensagem: ${error}`);
        return;
      }

      if (isNaN(pendingMessageId) || !pendingActivities.has(pendingMessageId)) {
        console.warn(`Atividade pendente não encontrada: ${pendingMessageId}`);
        return;
      }

      // Recupera a atividade pendente
      const pendingActivity = pendingActivities.get(pendingMessageId)!;
      console.log(
        `Atividade pendente recuperada: ${JSON.stringify(pendingActivity)}`
      );

      try {
        // Agora criamos a atividade com todos os dados
        const activity = await createActivity(
          pendingActivity.userId,
          pendingActivity.content,
          pendingActivity.urgency || "medium", // Valor padrão caso não exista
          pendingActivity.impact || "medium" // Valor padrão caso não exista
        );

        // Formata e exibe o timestamp
        const timestamp = formatTimestamp(activity.createdAt);

        // Responde ao usuário
        await bot.editMessageText(
          `✅ Atividade registrada com sucesso!\n\nID: ${activity.id}\nData: ${timestamp}\n\nConteúdo:\n"${pendingActivity.content}"\n\n• Urgência: ${formatUrgencyLabel(pendingActivity.urgency || "medium")}\n• Impacto: ${formatImpactLabel(pendingActivity.impact || "medium")}`,
          {
            chat_id: chatId,
            message_id: messageId
          }
        );

        // Envia um sticker para nova atividade
        await sendStickerSafely(bot, chatId, "new_activity");

        console.log(
          `Atividade ${activity.id} criada para o usuário ${pendingActivity.userId} com urgência "${pendingActivity.urgency}" e impacto "${pendingActivity.impact}"`
        );

        // Remove a atividade pendente do mapa
        pendingActivities.delete(pendingMessageId);

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Atividade registrada com sucesso!"
        });
      } catch (error) {
        console.error("Erro ao finalizar registro de atividade:", error);
        bot.sendMessage(
          chatId,
          "Erro ao registrar sua atividade. Por favor, tente novamente."
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao registrar"
        });
      }
    } else if (data.startsWith("edit_activity:")) {
      // Processar edição da atividade - reinicia o fluxo de seleção
      // Formato do callback: edit_activity:MESSAGE_ID
      console.log(`[DEBUG] Processando edit_activity com dados: ${data}`);

      // Extrai o ID da mensagem usando split (mais confiável que substring)
      let pendingMessageId;
      try {
        const parts = data.split(":");
        if (parts.length === 2 && parts[0] === "edit_activity") {
          pendingMessageId = parseInt(parts[1], 10);
          console.log(
            `[DEBUG] ID extraído via split: ${parts[1]}, convertido para número: ${pendingMessageId}`
          );
        } else {
          console.warn(
            `[WARN] Formato inválido para edit_activity: ${data}, partes: ${JSON.stringify(parts)}`
          );
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Erro: formato inválido"
          });
          return;
        }
      } catch (error) {
        console.error(`[ERROR] Erro ao extrair ID da mensagem: ${error}`);
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao processar solicitação"
        });
        return;
      }

      // Debug: mostra todas as atividades pendentes
      console.log(
        `[DEBUG] Atividades pendentes: ${Array.from(pendingActivities.keys()).join(", ")}`
      );

      if (isNaN(pendingMessageId) || !pendingActivities.has(pendingMessageId)) {
        console.warn(
          `[WARN] Atividade pendente não encontrada para edição: ${pendingMessageId}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: atividade não encontrada"
        });
        return;
      }

      // Recupera a atividade pendente (mantém conteúdo e userId)
      const pendingActivity = pendingActivities.get(pendingMessageId)!;
      console.log(
        `[DEBUG] Atividade recuperada: ${JSON.stringify(pendingActivity)}`
      );

      try {
        // Apresenta novamente as opções de impacto
        const impactOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Alto",
                  callback_data: `impact_edited:high:${pendingMessageId}`
                },
                {
                  text: "Médio",
                  callback_data: `impact_edited:medium:${pendingMessageId}`
                },
                {
                  text: "Baixo",
                  callback_data: `impact_edited:low:${pendingMessageId}`
                }
              ]
            ]
          }
        };

        // Envia nova mensagem perguntando sobre o impacto
        await bot.sendMessage(
          chatId,
          `Qual é o impacto desta atividade?\n\n"${pendingActivity.content}"`,
          impactOptions
        );

        console.log(
          `Reiniciando fluxo de seleção para atividade "${pendingActivity.content}" (ID msg: ${pendingMessageId})`
        );

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Selecione novamente o impacto"
        });
      } catch (error) {
        console.error("Erro ao processar edição de atividade:", error);
        bot.sendMessage(
          chatId,
          "Erro ao processar sua seleção. Por favor, tente novamente."
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao processar"
        });
      }
    } else if (data.startsWith("impact_edited:")) {
      // Processa impacto após edição, e agora pergunta sobre urgência
      // Formato do callback: impact_edited:VALOR:MESSAGE_ID
      const [, impactValue, pendingMessageIdStr] = data.split(":");
      const pendingMessageId = parseInt(pendingMessageIdStr, 10);

      if (isNaN(pendingMessageId) || !pendingActivities.has(pendingMessageId)) {
        console.warn(
          `Atividade pendente não encontrada para impacto editado: ${pendingMessageId}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: atividade não encontrada"
        });
        return;
      }

      // Recupera a atividade pendente
      const pendingActivity = pendingActivities.get(pendingMessageId)!;

      // Atualiza o impacto
      pendingActivity.impact = impactValue;
      pendingActivities.set(pendingMessageId, pendingActivity);

      try {
        // Opções de urgência
        const urgencyOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Alta",
                  callback_data: `urgency_edited:high:${pendingMessageId}`
                },
                {
                  text: "Média",
                  callback_data: `urgency_edited:medium:${pendingMessageId}`
                },
                {
                  text: "Baixa",
                  callback_data: `urgency_edited:low:${pendingMessageId}`
                }
              ]
            ]
          }
        };

        // Envia mensagem perguntando sobre a urgência após edição do impacto
        await bot.sendMessage(
          chatId,
          `Qual é a urgência desta atividade?\n\n"${pendingActivity.content}"\n\nImpacto: ${formatImpactLabel(impactValue)}`,
          urgencyOptions
        );

        console.log(
          `Pedindo urgência após edição para atividade "${pendingActivity.content}" com impacto "${impactValue}" do usuário ${pendingActivity.userId}`
        );

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Impacto atualizado. Agora selecione a urgência."
        });
      } catch (error) {
        console.error("Erro ao processar seleção de impacto editado:", error);
        bot.sendMessage(
          chatId,
          "Erro ao processar sua seleção. Por favor, tente novamente."
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao processar"
        });
      }
    } else if (data.startsWith("urgency_edited:")) {
      // Processa urgência após edição e mostra confirmação
      // Formato do callback: urgency_edited:VALOR:MESSAGE_ID
      const [, urgencyValue, pendingMessageIdStr] = data.split(":");
      const pendingMessageId = parseInt(pendingMessageIdStr, 10);

      if (isNaN(pendingMessageId) || !pendingActivities.has(pendingMessageId)) {
        console.warn(
          `Atividade pendente não encontrada para urgência editada: ${pendingMessageId}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: atividade não encontrada"
        });
        return;
      }

      // Recupera a atividade pendente
      const pendingActivity = pendingActivities.get(pendingMessageId)!;

      // Atualiza a urgência
      pendingActivity.urgency = urgencyValue;
      pendingActivities.set(pendingMessageId, pendingActivity);

      try {
        // Nova etapa: mostrar confirmação de urgência e impacto antes de salvar
        const confirmOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Confirmar",
                  callback_data: `save_activity:${pendingMessageId}`
                },
                {
                  text: "✏️ Editar",
                  callback_data: `edit_activity:${pendingMessageId}`
                }
              ]
            ]
          }
        };

        // Envia mensagem de confirmação com resumo da atividade
        await bot.sendMessage(
          chatId,
          `Confira os detalhes da sua atividade:\n\n"${pendingActivity.content}"\n\n• Urgência: ${formatUrgencyLabel(pendingActivity.urgency || "medium")}\n• Impacto: ${formatImpactLabel(pendingActivity.impact || "medium")}\n\nDeseja confirmar ou editar?`,
          confirmOptions
        );

        console.log(
          `Solicitando confirmação após edição para atividade "${pendingActivity.content}" (ID msg: ${pendingMessageId})`
        );

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Confira os detalhes e confirme"
        });
      } catch (error) {
        console.error("Erro ao processar seleção de urgência editada:", error);
        bot.sendMessage(
          chatId,
          "Erro ao processar sua seleção. Por favor, tente novamente."
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro ao processar"
        });
      }
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

/**
 * Função auxiliar para gerar e enviar PDF com base no período
 */
async function generateAndSendPDF(
  bot: TelegramBot,
  user: any,
  period: number,
  chatId: number,
  replyToMessageId?: number
) {
  try {
    // Busca atividades
    const activities = await getActivitiesByPeriod(user.id, period);

    if (activities.length === 0) {
      bot.sendMessage(
        chatId,
        `Não encontrei nenhuma atividade para os últimos ${period} dias. Não é possível gerar o PDF.`,
        replyToMessageId ? { reply_to_message_id: replyToMessageId } : undefined
      );
      return;
    }

    // Gera o PDF
    console.log(`[DEBUG] Gerando PDF para ${activities.length} atividades`);

    // Sanitiza atividades para converter null para undefined
    const sanitizedActivities = activities.map((activity: any) => ({
      ...activity,
      urgency: activity.urgency ?? undefined,
      impact: activity.impact ?? undefined
    }));

    const pdfResult = await generateBragDocumentPDF({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName || undefined,
        username: user.username || undefined
      },
      activities: sanitizedActivities.map((a) => ({
        id: a.id,
        content: a.content,
        date: a.createdAt,
        urgency: a.urgency || undefined,
        impact: a.impact || undefined
      })),
      generatedAt: new Date(),
      period: period
    });

    // Opções de Telegram para envio do documento
    const options: TelegramBot.SendDocumentOptions = {
      caption: `Brag Document`
    };

    if (replyToMessageId) {
      options.reply_to_message_id = replyToMessageId;
    }

    if (pdfResult.success) {
      // Usa o buffer do PDF gerado pela função generateBragDocumentPDF
      const pdfBuffer =
        pdfResult.buffer || Buffer.from("Conteúdo do PDF de exemplo");

      // Envia o documento PDF
      await bot.sendDocument(chatId, pdfBuffer, options, {
        filename: "brag-document.pdf",
        contentType: "application/pdf"
      });
    } else {
      await bot.sendMessage(
        chatId,
        "Não foi possível gerar o PDF neste momento. Por favor, tente novamente mais tarde.",
        { parse_mode: "Markdown" }
      );
    }

    // Envia um sticker para brag document/PDF
    await sendStickerSafely(bot, chatId, "brag");

    console.log(`PDF enviado com sucesso para o usuário ${user.id}`);
  } catch (error) {
    console.error("[ERROR] Erro em generateAndSendPDF:", error);
    throw error; // Propaga o erro para tratamento no chamador
  }
}

// Funções auxiliares para testes (exportadas apenas em ambiente de teste)
export const _testHelpers = {
  setOnboardingStatus: (userId: number, status: boolean) => {
    if (status) {
      onboardingInProgress.set(userId, true);
    } else {
      onboardingInProgress.delete(userId);
    }
  },
  getOnboardingStatus: (userId: number) => {
    return onboardingInProgress.get(userId) || false;
  },
  clearOnboardingStatus: () => {
    onboardingInProgress.clear();
  },
  // Adicionando exportações para os novos handlers para testes
  handleSaveActivity: async (
    bot: TelegramBot,
    callbackQuery: TelegramBot.CallbackQuery
  ) => {
    if (!callbackQuery.message || !callbackQuery.data) return;

    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    // Extrair o ID da mensagem de forma consistente com o handler principal
    let pendingMessageId;
    try {
      const parts = data.split(":");
      if (parts.length === 2 && parts[0] === "save_activity") {
        pendingMessageId = parseInt(parts[1], 10);
      } else {
        console.warn(`Formato inválido para save_activity: ${data}`);
        return;
      }
    } catch (error) {
      console.error(`Erro ao extrair ID da mensagem: ${error}`);
      return;
    }

    if (isNaN(pendingMessageId) || !pendingActivities.has(pendingMessageId)) {
      console.warn(`Atividade pendente não encontrada: ${pendingMessageId}`);
      return;
    }

    const pendingActivity = pendingActivities.get(pendingMessageId)!;
    try {
      const activity = await createActivity(
        pendingActivity.userId,
        pendingActivity.content,
        pendingActivity.urgency || "medium",
        pendingActivity.impact || "medium"
      );

      const timestamp = formatTimestamp(activity.createdAt);
      await bot.editMessageText(
        `✅ Atividade registrada com sucesso!\n\nID: ${activity.id}\nData: ${timestamp}\n\nConteúdo:\n"${pendingActivity.content}"\n\n• Urgência: ${formatUrgencyLabel(pendingActivity.urgency || "medium")}\n• Impacto: ${formatImpactLabel(pendingActivity.impact || "medium")}`,
        {
          chat_id: chatId,
          message_id: messageId
        }
      );

      await sendStickerSafely(bot, chatId, "new_activity");
      pendingActivities.delete(pendingMessageId);

      return activity;
    } catch (error) {
      throw error;
    }
  }
};
