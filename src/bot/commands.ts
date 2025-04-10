import TelegramBot from "node-telegram-bot-api";
import { resetBotState } from ".";
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
import { isPdfRequest, isBragTextRequest, NluResult } from "../utils/nluUtils";
import {
  formatActivitiesForPrompt,
  analyzeProfileWithLLM
} from "../utils/llmUtils";
import { sendSafeMarkdown } from "../utils/telegramUtils";
import { handleUserError, ERROR_MESSAGES } from "../utils/errorUtils";

// Armazena temporariamente as atividades pendentes de confirmação completa
interface PendingActivityData {
  userId: number;
  content: string;
  activityId?: number; // Preenchido após a criação da atividade
  urgency?: string;
  impact?: string;
}

// Mapeia IDs de mensagens que devem parar animação (para coordenar exclusão e animação)
export const messagesToStopAnimation = new Set<string>();

// Mapeia IDs de mensagem para atividades pendentes
export const pendingActivities = new Map<number, PendingActivityData>();

// Mapeia IDs de usuários para status de fixação de mensagens de instruções
export const pinnedInstructionsStatus = new Map<number, boolean>();

// Mapeia IDs de usuários para status de onboarding em andamento
export const onboardingInProgress = new Map<number, boolean>();

// Mapeia IDs de usuários para atividades do último documento gerado
export const lastGeneratedDocumentActivities = new Map<number, Activity[]>();

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
      // Envia mensagem de carregamento
      const loadingMessage = await bot.sendMessage(
        chatId,
        "⏳ Carregando seus dados..."
      );

      // Usuário já cadastrado - mantém a mensagem padrão de reentrada
      // Envia um sticker de onboarding
      await sendStickerSafely(bot, chatId, "onboarding");

      await bot.sendMessage(
        chatId,
        `Olá novamente, ${telegramUser.first_name}! Você já está cadastrado no Bragfy.`
      );

      // Remove a mensagem de carregamento
      try {
        await bot.deleteMessage(chatId, loadingMessage.message_id);
      } catch (deleteError) {
        console.warn(
          `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
        );
      }

      // Envia e fixa a mensagem de instruções para relembrar o usuário
      await sendAndPinInstructions(bot, chatId, telegramUser.id);

      // Finaliza o onboarding para usuários existentes
      onboardingInProgress.delete(telegramUser.id);
      console.log(
        `Onboarding finalizado para usuário existente ${telegramUser.id}`
      );
    } else {
      try {
        // Envia mensagem de carregamento
        const loadingMessage = await bot.sendMessage(
          chatId,
          "⏳ Registrando seu usuário..."
        );

        // Novo usuário, vamos cadastrar
        console.log(`Criando novo usuário com ID ${telegramUser.id}`);
        await createUser(telegramUser);
        console.log(`Usuário ${telegramUser.id} criado com sucesso`);

        // Remove a mensagem de carregamento
        try {
          await bot.deleteMessage(chatId, loadingMessage.message_id);
        } catch (deleteError) {
          console.warn(
            `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
          );
        }

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
        `Inconsistência: userExists retornou true mas getUserByTelegramId retornou null para usuário ${telegramUser.id}`
      );
      bot.sendMessage(
        chatId,
        `Erro: Não foi possível recuperar seus dados. Por favor, use o comando /start para reiniciar a conversa.`
      );
      return;
    }

    // Verifica se é a primeira atividade do dia
    let loadingMessage = null;
    try {
      const todayActivities = await getActivitiesByPeriod(user.id, 1);

      // Se não tiver atividades hoje, mostra mensagem de carregamento específica
      if (todayActivities.length === 0) {
        console.log(`Primeira atividade do dia para usuário ${user.id}`);
        loadingMessage = await bot.sendMessage(
          chatId,
          "⏳ Registrando sua primeira atividade do dia..."
        );
      }
    } catch (activityError) {
      console.warn(`Erro ao verificar atividades do dia: ${activityError}`);
      // Continua o fluxo mesmo se houver erro na verificação
    }

    // Verificação usando NLU para pedidos de PDF
    const msgLower = messageText.toLowerCase().trim();

    // Mantém compatibilidade com comandos diretos como "/brag"
    const isDirectCommand =
      msgLower === "/brag" || msgLower === "/bragfy" || msgLower === "bragfy";

    // Usa NLU para detectar solicitação de PDF - agora usando a nova interface NluResult
    const pdfRequestResult = await isPdfRequest(messageText);

    // Usa NLU para detectar solicitação de Brag Document - agora usando a nova interface NluResult
    const bragRequestResult = await isBragTextRequest(messageText);

    // Para depuração, exibe logs mais detalhados quando a confiança é alta
    if (
      pdfRequestResult.confidence > 0.95 ||
      bragRequestResult.confidence > 0.95
    ) {
      console.log(
        `[NLU] Detecção com alta confiança para: "${messageText}"\nPDF: ${JSON.stringify(
          {
            isMatch: pdfRequestResult.isMatch,
            confidence: pdfRequestResult.confidence,
            intent: pdfRequestResult.intent
          }
        )}\nBrag: ${JSON.stringify({
          isMatch: bragRequestResult.isMatch,
          confidence: bragRequestResult.confidence,
          intent: bragRequestResult.intent
        })}`
      );
    }

    // Usa apenas o campo isMatch que já incorpora a verificação de limite de confiança
    const isBragRequest = isDirectCommand || bragRequestResult.isMatch;
    const isPdfRequestMatch = pdfRequestResult.isMatch;

    if (isBragRequest || isPdfRequestMatch) {
      console.log(
        `Usuário ${telegramUser.id} solicitou geração de documento com a mensagem: "${messageText}"`
      );

      if (isPdfRequestMatch) {
        console.log(
          `[NLU] Usuário ${telegramUser.id} solicitou PDF diretamente (confiança: ${pdfRequestResult.confidence.toFixed(2)})`
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

      // Para brag text request ou comando direto
      console.log(
        `[NLU] Usuário ${telegramUser.id} solicitou Brag Document${bragRequestResult.isMatch ? ` (confiança: ${bragRequestResult.confidence.toFixed(2)})` : " via comando direto"}`
      );

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
            { text: "✅ Ok", callback_data: `confirm:${messageText}` },
            { text: "✏️ Editar", callback_data: "edit" },
            { text: "❌ Cancelar", callback_data: "cancel" }
          ]
        ]
      }
    };

    console.log(`Usuário ${telegramUser.id} enviou mensagem: "${messageText}"`);

    // Envia a mensagem de confirmação
    await bot.sendMessage(
      chatId,
      `Recebi sua atividade:\n\n"${messageText}"\n\nDeseja confirmar, editar ou cancelar?`,
      options
    );

    // Remove a mensagem de carregamento se existir
    if (loadingMessage) {
      try {
        await bot.deleteMessage(chatId, loadingMessage.message_id);
        console.log(
          `Mensagem de carregamento removida para usuário ${user.id}`
        );
      } catch (deleteError) {
        console.warn(
          `Erro ao remover mensagem de carregamento: ${deleteError}`
        );
      }
    }
  } catch (error) {
    console.error("Erro ao processar nova mensagem:", error);

    // Garante que o usuário sempre receba feedback, mesmo em caso de erro
    try {
      // Usar handleUserError para garantir um ID de rastreamento para depuração
      await handleUserError(bot, msg.chat.id, error, "message_processing", {
        userId: msg.from?.id,
        messageId: msg.message_id,
        messageText: msg.text,
        baseMessage: ERROR_MESSAGES.MESSAGE_PROCESSING
      });
    } catch (sendError) {
      console.error(
        "Erro ao enviar mensagem de erro para o usuário:",
        sendError
      );
    }
  }
};

/**
 * Cria uma animação de três pontos para indicar atividade de processamento
 * @param bot - Instância do bot do Telegram
 * @param chatId - ID do chat
 * @param messageId - ID da mensagem a ser editada
 * @param baseText - Texto base da mensagem
 * @param iterations - Número de iterações da animação (padrão: 3)
 * @returns Promise que é resolvida quando a animação termina
 */
export async function createLoadingAnimation(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  baseText: string,
  iterations: number = 3
): Promise<void> {
  // Verificação defensiva para entrada inválida
  if (!messageId || messageId <= 0 || !chatId || chatId === 0) {
    console.warn(
      `[ANIMATION] Parâmetros inválidos para animação: chatId=${chatId}, messageId=${messageId}`
    );
    return;
  }

  const dots = [".", "..", "..."];
  const delay = 700; // ms entre atualizações
  let messageExists = true;

  // Chave única para identificar esta mensagem
  const messageKey = `${chatId}:${messageId}`;

  // Lista abrangente de padrões de erro que indicam que a mensagem não existe ou não pode ser editada
  const invalidMessagePatterns = [
    "message to edit not found",
    "MESSAGE_ID_INVALID",
    "message can't be edited",
    "message is not modified",
    "Bad Request",
    "message identifier is not specified",
    "message to delete not found",
    "chat not found",
    "CHAT_NOT_FOUND"
  ];

  // Verifica se a mensagem existe antes de iniciar a animação
  try {
    // Verifica se a mensagem já foi marcada para exclusão
    if (messagesToStopAnimation.has(messageKey)) {
      console.log(
        `[ANIMATION] Mensagem ${messageId} já está marcada para exclusão, não iniciando animação`
      );
      return;
    }

    // Tenta fazer uma edição simples para verificar se a mensagem existe
    await bot.editMessageText(`${baseText}`, {
      chat_id: chatId,
      message_id: messageId
    });
  } catch (error) {
    const errorMessage = String(error);

    // Verifica se o erro indica que a mensagem não existe ou não pode ser editada
    if (
      invalidMessagePatterns.some((pattern) => errorMessage.includes(pattern))
    ) {
      console.warn(
        `[ANIMATION] Mensagem ${messageId} não existe ou não pode ser editada: ${error}`
      );
      return; // Encerra imediatamente
    } else {
      // Outros erros de inicialização são registrados mas tentamos continuar
      console.warn(
        `[ANIMATION] Erro ao verificar mensagem de animação: ${error}`
      );
    }
  }

  // Continua com a animação apenas se a verificação inicial passou
  for (let i = 0; i < iterations && messageExists; i++) {
    for (const dot of dots) {
      // Verifica se a mensagem foi marcada para exclusão antes de cada tentativa de edição
      if (messagesToStopAnimation.has(messageKey)) {
        console.log(
          `[ANIMATION] Mensagem ${messageId} marcada para exclusão, parando animação`
        );
        // Remove da lista após processar
        messagesToStopAnimation.delete(messageKey);
        return;
      }

      try {
        await bot.editMessageText(`${baseText}${dot}`, {
          chat_id: chatId,
          message_id: messageId
        });

        // Espera entre atualizações
        await new Promise((resolve) => {
          // Use .unref() para evitar que o timer bloqueie o encerramento do processo
          setTimeout(resolve, delay).unref();
        });
      } catch (error) {
        const errorMessage = String(error);

        // Verifica se o erro indica que a mensagem não existe ou não pode ser editada
        if (
          invalidMessagePatterns.some((pattern) =>
            errorMessage.includes(pattern)
          )
        ) {
          console.warn(`[ANIMATION] Interrompendo animação: ${error}`);
          messageExists = false;
          break; // Sai do loop interno e não tenta mais edições
        } else {
          // Para outros erros, apenas loga e continua
          console.warn(
            `[ANIMATION] Erro ao atualizar animação de carregamento: ${error}`
          );
        }
      }
    }
  }

  // Limpa as marcações quando a animação termina normalmente
  if (messagesToStopAnimation.has(messageKey)) {
    messagesToStopAnimation.delete(messageKey);
  }
}

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
        // Informa ao usuário editando a mensagem original como indicador de carregamento
        console.log(
          `[DEBUG] Editando mensagem ${messageId} para "Gerando..." para usuário ${telegramUser.id}`
        );

        // Edita a mensagem original para mostrar o carregamento
        const loadingMsgId = messageId; // Armazena o ID da mensagem de carregamento
        await bot.editMessageText(
          `⏳ Gerando seu Brag Document para os últimos ${period} dia(s)...`,
          {
            chat_id: chatId,
            message_id: loadingMsgId
          }
        );

        // Inicia animação de carregamento na mensagem de carregamento
        createLoadingAnimation(
          bot,
          chatId,
          loadingMsgId,
          `⏳ Gerando seu Brag Document para os últimos ${period} dia(s)`
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

          // Remove a mensagem de carregamento
          try {
            // Sinaliza para a animação que vamos remover esta mensagem
            const messageKey = `${chatId}:${loadingMsgId}`;
            messagesToStopAnimation.add(messageKey);

            // Pequena pausa para ter certeza que a animação verá o sinal
            await new Promise((resolve) => setTimeout(resolve, 100));

            await bot.deleteMessage(chatId, loadingMsgId);
            console.log(
              `[DEBUG] Mensagem de carregamento removida para usuário ${telegramUser.id}`
            );
          } catch (deleteError) {
            console.warn(
              `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
            );
            // Continua mesmo se não puder deletar
          }

          // Envia nova mensagem informando que não há atividades
          await bot.sendMessage(
            chatId,
            `Hmm, não encontrei nenhuma atividade registrada nos últimos ${period} dia(s).\n\nQue tal registrar algumas conquistas agora?`
          );

          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Nenhuma atividade encontrada"
          });
          return; // Finaliza aqui se não houver atividades
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
          `[DEBUG] Documento gerado com sucesso para usuário ${telegramUser.id}, enviando como nova mensagem`
        );

        // Remove a mensagem de carregamento
        try {
          // Sinaliza para a animação que vamos remover esta mensagem
          const messageKey = `${chatId}:${loadingMsgId}`;
          messagesToStopAnimation.add(messageKey);

          // Pequena pausa para ter certeza que a animação verá o sinal
          await new Promise((resolve) => setTimeout(resolve, 100));

          await bot.deleteMessage(chatId, loadingMsgId);
        } catch (deleteError) {
          console.warn(
            `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
          );
        }

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

          // ENVIA COMO NOVA MENSAGEM usando sendSafeMarkdown (mais seguro para documentos longos)
          const sentDocument = await sendSafeMarkdown(
            bot,
            chatId,
            bragDocument,
            {
              parse_mode: "Markdown",
              reply_markup: inlineKeyboard.reply_markup
            }
          );

          console.log(
            `[DEBUG] Brag Document enviado como nova mensagem ID: ${
              Array.isArray(sentDocument)
                ? sentDocument[0].message_id
                : sentDocument.message_id
            }`
          );

          // Envia um sticker para brag document
          await sendStickerSafely(bot, chatId, "brag");

          console.log(
            `Brag Document com ${activities.length} atividades gerado para o usuário ${user.id}`
          );
          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Documento gerado!"
          });

          // Após enviar o documento, pergunte se o usuário deseja uma análise de perfil
          try {
            // Armazena as atividades para uso posterior na análise
            lastGeneratedDocumentActivities.set(telegramUser.id, activities);

            // Após enviar o documento, adiciona a mensagem de solicitação de análise
            const analysisOptions = {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "✅ Sim", callback_data: `analyze:${period}` },
                    { text: "⏱️ Agora não", callback_data: "analyze:no" }
                  ]
                ]
              }
            };

            await bot.sendMessage(
              chatId,
              "🎯 Deseja que o agente analise seu perfil de atuação durante esse ciclo?",
              analysisOptions
            );

            console.log(
              `Solicitação de análise de perfil enviada para usuário ${telegramUser.id}`
            );
          } catch (error) {
            console.error(
              "[ERROR] Erro ao solicitar análise de perfil:",
              error
            );
          }
        } catch (markdownError) {
          console.error("[ERROR] Erro ao renderizar Markdown:", markdownError);

          // Tenta novamente sem formatação Markdown, enviando como nova mensagem
          await sendSafeMarkdown(
            bot,
            chatId,
            "Seu Brag Document foi gerado, mas ocorreu um erro de formatação. Mostrando versão simplificada...\n\n" +
              bragDocument.replace(/[*_|]/g, ""),
            { parse_mode: undefined }
          );

          bot.answerCallbackQuery(callbackQuery.id, {
            text: "Documento gerado com limitações"
          });
        }
      } catch (error) {
        console.error("[ERROR] Erro ao gerar Brag Document:", error);

        // Remove a mensagem de carregamento em caso de erro, se ela existir
        try {
          await bot.deleteMessage(chatId, messageId);
        } catch (deleteError) {
          console.warn(
            `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
          );
        }

        // Envia mensagem de erro como nova mensagem
        try {
          await bot.sendMessage(
            chatId,
            "Desculpe, ocorreu um erro ao gerar seu Brag Document. Por favor, tente novamente mais tarde."
          );
        } catch (sendError) {
          console.error("[ERROR] Erro ao enviar mensagem de erro:", sendError);
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

      // Envia mensagem solicitando o PDF com animação
      const loadingMsg = await bot.sendMessage(
        chatId,
        `🧾 Gerando PDF do seu Brag Document...`
      );

      // Inicia animação de carregamento
      if (loadingMsg.message_id) {
        createLoadingAnimation(
          bot,
          chatId,
          loadingMsg.message_id,
          "🧾 Gerando PDF do seu Brag Document"
        );
      }

      try {
        // Busca as atividades e gera o PDF
        await generateAndSendPDF(bot, user, period, chatId);

        // Após enviar o PDF, adiciona a mensagem de solicitação de análise
        const analysisOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Sim", callback_data: `analyze:${period}` },
                { text: "⏱️ Agora não", callback_data: "analyze:no" }
              ]
            ]
          }
        };

        await bot.sendMessage(
          chatId,
          "🎯 Deseja que o agente analise seu perfil de atuação durante esse ciclo?",
          analysisOptions
        );

        console.log(
          `Solicitação de análise de perfil enviada para usuário ${telegramUser.id}`
        );
      } catch (error) {
        console.error("[ERROR] Erro ao gerar/enviar PDF:", error);
        await sendSafeMarkdown(
          bot,
          chatId,
          "Ocorreu um erro ao gerar seu PDF. Por favor, tente novamente mais tarde.",
          { parse_mode: "Markdown" }
        );
        return; // Saímos aqui para não enviar o sticker
      }

      // Remove a mensagem de carregamento após a conclusão
      try {
        // Sinaliza para a animação que vamos remover esta mensagem
        const messageKey = `${chatId}:${loadingMsg.message_id}`;
        messagesToStopAnimation.add(messageKey);

        // Pequena pausa para ter certeza que a animação verá o sinal
        await new Promise((resolve) => setTimeout(resolve, 100));

        await bot.deleteMessage(chatId, loadingMsg.message_id);
      } catch (deleteError) {
        console.warn(
          `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
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

      // Verifica se é a primeira atividade do dia e mostra loader apenas se for
      let activityLoadingMessage = null;
      try {
        const todayActivities = await getActivitiesByPeriod(user.id, 1);

        // Se não tiver atividades hoje, mostra mensagem de carregamento específica
        if (todayActivities.length === 0) {
          console.log(`Primeira atividade do dia para usuário ${user.id}`);
          activityLoadingMessage = await bot.sendMessage(
            chatId,
            "⏳ Registrando sua primeira atividade do dia..."
          );
        }
      } catch (activityError) {
        console.warn(`Erro ao verificar atividades do dia: ${activityError}`);
        // Continua o fluxo mesmo se houver erro na verificação
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

        // Remove a mensagem de carregamento se existir
        if (activityLoadingMessage) {
          try {
            await bot.deleteMessage(chatId, activityLoadingMessage.message_id);
          } catch (deleteError) {
            console.warn(
              `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
            );
          }
        }

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
                  text: "✅ Ok",
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
        // Nova etapa: mostrar confirmação de urgência e impacto antes de salvar
        const confirmOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Ok",
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
    } else if (data.startsWith("analyze:")) {
      // Processar solicitação de análise de perfil profissional
      // Formato: analyze:7 (período) ou analyze:no (recusa)

      if (data === "analyze:no") {
        // Usuário recusou a análise de perfil
        bot.sendMessage(
          chatId,
          "Tudo bem! Se quiser analisar depois, é só pedir."
        );

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Análise cancelada"
        });
        return;
      }

      // Extrai o período solicitado para análise
      const period = parseInt(data.substring(8), 10);

      if (isNaN(period) || ![1, 7, 30].includes(period)) {
        console.warn(
          `Período inválido recebido para análise: ${data.substring(8)}`
        );
        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Período inválido"
        });
        return;
      }

      // Busca as atividades armazenadas durante a última geração de documento
      const activities = lastGeneratedDocumentActivities.get(telegramUser.id);

      if (!activities || activities.length === 0) {
        console.warn(
          `Nenhuma atividade armazenada para análise de perfil do usuário ${telegramUser.id}`
        );
        bot.sendMessage(
          chatId,
          "Não foi possível recuperar suas atividades para análise. Por favor, gere novamente seu documento."
        );

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro: atividades não encontradas"
        });
        return;
      }

      // Envia mensagem de carregamento
      const loadingMsg = await bot.sendMessage(
        chatId,
        "⏳ Analisando seu perfil profissional com base nas atividades registradas..."
      );

      try {
        // Formata as atividades para o prompt
        const activitiesText = formatActivitiesForPrompt(activities);

        // Solicita análise ao LLM
        const analysis = await analyzeProfileWithLLM(activitiesText);

        if (analysis.success) {
          // Envia a análise como resposta
          await sendSafeMarkdown(
            bot,
            chatId,
            `*Análise de perfil profissional*\n\n${analysis.result}`,
            { parse_mode: "Markdown" }
          );

          // Envia um sticker
          await sendStickerSafely(bot, chatId, "brag_document");
        } else {
          // Envia mensagem de erro se a análise falhar
          bot.sendMessage(
            chatId,
            "Desculpe, não foi possível completar a análise do seu perfil. Por favor, tente novamente mais tarde ou entre em contato com o suporte."
          );
        }

        // Remove a mensagem de carregamento
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id);
        } catch (deleteError) {
          console.warn(
            `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
          );
        }

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Análise concluída"
        });
      } catch (error) {
        console.error("[ERROR] Erro ao analisar perfil profissional:", error);

        // Remove a mensagem de carregamento
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id);
        } catch (deleteError) {
          console.warn(
            `[WARN] Não foi possível remover mensagem de carregamento: ${deleteError}`
          );
        }

        bot.sendMessage(
          chatId,
          "Ocorreu um erro ao analisar seu perfil. Por favor, tente novamente mais tarde."
        );

        bot.answerCallbackQuery(callbackQuery.id, {
          text: "Erro na análise"
        });
      }
    } else {
      console.warn(`Comando inválido recebido: ${data}`);
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Comando inválido"
      });
    }
  } catch (error) {
    console.error("Erro ao processar callback:", error);
    bot.answerCallbackQuery(callbackQuery.id, {
      text: "Erro ao processar"
    });
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

    // Armazena as atividades para uso posterior na análise
    lastGeneratedDocumentActivities.set(user.telegramId, activities);

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
      await sendSafeMarkdown(
        bot,
        chatId,
        "Ocorreu um erro ao gerar seu PDF. Por favor, tente novamente mais tarde.",
        { parse_mode: "Markdown" }
      );
      return; // Saímos aqui para não enviar o sticker
    }

    // Envia um sticker para brag document/PDF
    await sendStickerSafely(bot, chatId, "brag");

    console.log(`PDF enviado com sucesso para o usuário ${user.id}`);
  } catch (error) {
    console.error("[ERROR] Erro em generateAndSendPDF:", error);
    // Não relança a exceção, apenas trata e envia mensagem ao usuário

    // Envia uma mensagem de erro amigável ao usuário
    await sendSafeMarkdown(
      bot,
      chatId,
      "Ocorreu um erro ao gerar seu PDF. Por favor, tente novamente mais tarde.",
      { parse_mode: "Markdown" }
    );
  }
}
