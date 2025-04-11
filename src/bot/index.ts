import TelegramBot from "node-telegram-bot-api";
import {
  handleStartCommand,
  handleNewChat,
  handleCallbackQuery,
  createLoadingAnimation,
  pendingActivities,
  pinnedInstructionsStatus,
  onboardingInProgress,
  lastGeneratedDocumentActivities,
  messagesToStopAnimation,
  clearAllAnimationTimers
} from "./commands";
import { handleUserError, ERROR_MESSAGES } from "../utils/errorUtils";

// Variável para controlar o estado geral do bot
export let botState = {
  isReady: false,
  startTime: new Date(),
  lastReset: new Date(),
  handlerErrors: 0,
  failedRequests: 0
};

// Map para rastrear se é a primeira interação do usuário na sessão atual
const firstInteractionUsers = new Map<number, boolean>();

// Map para controlar animações de carregamento ativas
const activeLoadingAnimations = new Map<
  number,
  { messageId: number; chatId: number }
>();

/**
 * Bot instance global (para exportação em testes)
 */
let botInstance: TelegramBot | null = null;

/**
 * Reseta todos os estados do bot para uma condição limpa
 */
export function resetBotState() {
  console.log("🔄 [RESET] Reiniciando estado interno do bot");

  // Data structures from index.ts
  firstInteractionUsers.clear();
  activeLoadingAnimations.clear();

  // Data structures from commands.ts
  pendingActivities.clear();
  pinnedInstructionsStatus.clear();
  onboardingInProgress.clear();
  lastGeneratedDocumentActivities.clear();
  messagesToStopAnimation.clear();

  // Reset bot state tracking
  botState.handlerErrors = 0;
  botState.failedRequests = 0;
  botState.lastReset = new Date();

  console.log("✅ [RESET] Estado do bot reiniciado com sucesso");
}

/**
 * Verifica o status do bot
 */
export function getBotStatus(): Record<string, any> {
  return {
    status: botState.isReady ? "online" : "initializing",
    uptime: Math.floor(
      (new Date().getTime() - botState.startTime.getTime()) / 1000
    ),
    lastReset: botState.lastReset.toISOString(),
    activeUsers: firstInteractionUsers.size,
    activeLoaders: activeLoadingAnimations.size,
    pendingActivities: pendingActivities.size,
    handlerErrors: botState.handlerErrors,
    failedRequests: botState.failedRequests
  };
}

/**
 * Inicializa o bot do Telegram
 * @param token Token do Telegram bot
 * @returns Instância do bot configurada
 */
export function initBot(token: string): TelegramBot {
  // Reset state on initialization
  resetBotState();

  // Verifica se o token está vazio (modo de simulação)
  if (!token) {
    console.log("🤖 Bot iniciado em modo de simulação!");
    console.log("⚠️ Nenhum comando será processado automaticamente.");
    console.log("ℹ️ Use o console para simular comandos.");

    // Retorna um objeto com os métodos mínimos necessários
    const mockBot = {
      onText: () => {},
      on: () => {},
      sendMessage: (chatId: number, text: string) => {
        console.log(`[Simulação] Mensagem enviada para ${chatId}: ${text}`);
        return Promise.resolve({} as any);
      }
    } as any;

    botState.isReady = true;
    return mockBot;
  }

  // Determina se devemos usar polling baseado no ambiente
  const isTestEnvironment = process.env.NODE_ENV === "test";
  const usePolling = !process.env.TELEGRAM_WEBHOOK_URL && !isTestEnvironment;

  // Em ambiente de teste, inicializa sem polling para evitar handles abertos
  const pollingConfig = usePolling ? { polling: true } : {};

  console.log(
    `🤖 Iniciando bot ${isTestEnvironment ? "em modo de teste" : "com polling: " + usePolling}`
  );

  // Cria uma instância do agente com polling habilitado apenas fora do ambiente de teste
  const bot = new TelegramBot(token, pollingConfig);

  botInstance = bot;

  console.log("Agente iniciado!");

  // Registra handler para o comando /start com parâmetro opcional
  bot.onText(
    /\/start(?:\s+(.+))?/,
    (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
      try {
        // Forçar reset de estado ao receber comando /start
        resetBotState();

        const source = match ? match[1] : undefined;
        handleStartCommand(bot, msg, source);
      } catch (error) {
        botState.handlerErrors++;
        handleUserError(bot, msg.chat.id, error, "command_start", {
          userId: msg.from?.id,
          messageId: msg.message_id,
          messageText: msg.text,
          baseMessage: ERROR_MESSAGES.UNRECOVERABLE
        });
      }
    }
  );

  // Adiciona handler para comando /status que retorna o status do bot
  bot.onText(/\/status(?:\s+(.+))?/, (msg: TelegramBot.Message) => {
    try {
      const status = getBotStatus();
      const statusText = `
*Status do Bragfy*
Status: ${status.status}
Tempo ativo: ${status.uptime} segundos
Último reinício: ${new Date(status.lastReset).toLocaleString("pt-BR")}
Usuários ativos: ${status.activeUsers}
Animações ativas: ${status.activeLoaders}
Atividades pendentes: ${status.pendingActivities}
Erros de handler: ${status.handlerErrors}
Requisições falhas: ${status.failedRequests}
      `;

      bot.sendMessage(msg.chat.id, statusText, { parse_mode: "Markdown" });
    } catch (error) {
      handleUserError(bot, msg.chat.id, error, "command_status", {
        userId: msg.from?.id,
        messageId: msg.message_id
      });
    }
  });

  // Registra handler para todas as mensagens com tratamento de erros aprimorado
  bot.on("message", async (msg: TelegramBot.Message) => {
    // Ignora comandos
    if (msg.text && msg.text.startsWith("/")) return;

    // Verifica se há um usuário válido na mensagem
    if (!msg.from || !msg.from.id) return;

    const userId = msg.from.id;
    const chatId = msg.chat.id;

    try {
      // Simula digitação antes de enviar a mensagem
      await bot.sendChatAction(msg.chat.id, "typing");

      // Verifica se é a primeira interação do usuário nesta sessão
      if (!firstInteractionUsers.has(userId)) {
        // Marca que o usuário já interagiu nesta sessão
        firstInteractionUsers.set(userId, true);

        try {
          // Envia mensagem de loader para primeira interação
          const loaderMsg = await bot.sendMessage(
            chatId,
            "Ainda estou acordando..."
          );

          // Armazena a referência da animação de carregamento
          if (loaderMsg && loaderMsg.message_id) {
            // Registra a animação ativa
            activeLoadingAnimations.set(userId, {
              messageId: loaderMsg.message_id,
              chatId: chatId
            });

            // Adiciona animação ao loader - executa imediatamente uma vez para o teste
            await bot.editMessageText("Ainda estou acordando...", {
              chat_id: chatId,
              message_id: loaderMsg.message_id
            });

            // Inicia a animação completa
            createLoadingAnimation(
              bot,
              chatId,
              loaderMsg.message_id,
              "Ainda estou acordando",
              2
            );
          }
        } catch (error: unknown) {
          console.warn(`Erro ao enviar loader para usuário ${userId}:`, error);
        }
      } else {
        // Para usuários que já interagiram, verifica o tipo de comando pelo conteúdo da mensagem
        try {
          const messageText = msg.text?.toLowerCase() || "";
          let loaderText = "Registrando atividade...";

          // Detecta se é uma solicitação de PDF
          if (
            messageText.includes("pdf") ||
            messageText.includes("documento") ||
            messageText.includes("gerar documento")
          ) {
            loaderText = "Processando solicitação de PDF...";
          }
          // Detecta se é uma solicitação de Brag Document ou Resumo
          else if (
            messageText.includes("resumo") ||
            messageText.includes("brag") ||
            messageText.includes("ver atividades")
          ) {
            loaderText = "Preparando seu resumo de atividades...";
          }

          // Envia a mensagem de loading contextual
          const loaderMsg = await bot.sendMessage(chatId, loaderText);

          // Armazena a referência da animação de carregamento
          if (loaderMsg && loaderMsg.message_id) {
            // Registra a animação ativa
            activeLoadingAnimations.set(userId, {
              messageId: loaderMsg.message_id,
              chatId: chatId
            });

            // Adiciona animação ao loader
            createLoadingAnimation(
              bot,
              chatId,
              loaderMsg.message_id,
              loaderText.replace("...", ""),
              1
            );
          }
        } catch (error: unknown) {
          console.warn(`Erro ao enviar loader para usuário ${userId}:`, error);
        }
      }

      // Processa nova mensagem com tratamento de erros aprimorado
      try {
        await handleNewChat(bot, msg);
      } catch (error) {
        botState.handlerErrors++;
        await handleUserError(bot, chatId, error, "message_processing", {
          userId,
          messageId: msg.message_id,
          messageText: msg.text,
          baseMessage: ERROR_MESSAGES.MESSAGE_PROCESSING,
          state: {
            firstInteraction: firstInteractionUsers.has(userId),
            hasActiveLoading: activeLoadingAnimations.has(userId)
          }
        });
      }

      // Tenta remover a mensagem de carregamento após processar a mensagem
      try {
        const loadingInfo = activeLoadingAnimations.get(userId);
        if (loadingInfo) {
          // Aguarda um pequeno tempo para garantir que a resposta principal foi enviada
          const timer = setTimeout(async () => {
            try {
              await bot.deleteMessage(
                loadingInfo.chatId,
                loadingInfo.messageId
              );
              console.log(`[LOADER] Removido com sucesso para ${userId}`);
            } catch (deleteError: unknown) {
              console.warn(`[LOADER] Erro ao remover loader: ${deleteError}`);
            } finally {
              // Limpa a referência independente do resultado
              activeLoadingAnimations.delete(userId);
            }
          }, 500);

          // Garante que o timer não bloqueia a finalização do processo
          timer.unref();
        }
      } catch (error: unknown) {
        console.warn(`[LOADER] Erro ao processar remoção: ${error}`);
      }
    } catch (error) {
      // Tratamento de erro global para qualquer falha no handler de mensagem
      botState.failedRequests++;
      handleUserError(bot, chatId, error, "message_handler_global", {
        userId,
        messageId: msg.message_id,
        messageText: msg.text,
        baseMessage: ERROR_MESSAGES.UNRECOVERABLE
      });
    }
  });

  // Registra handler para callbacks de botões inline com tratamento de erros aprimorado
  bot.on("callback_query", (query: TelegramBot.CallbackQuery) => {
    if (!query.message || !query.from) {
      console.warn("Dados de callback incompletos, ignorando requisição");
      return;
    }

    const chatId = query.message.chat.id;

    try {
      // Processa o callback com tratamento de erros
      handleCallbackQuery(bot, query);

      // Tenta remover qualquer loader ativo após o callback
      if (query.from && query.from.id) {
        try {
          const loadingInfo = activeLoadingAnimations.get(query.from.id);
          if (loadingInfo) {
            setTimeout(async () => {
              try {
                await bot.deleteMessage(
                  loadingInfo.chatId,
                  loadingInfo.messageId
                );
                console.log(
                  `[LOADER] Removido após callback para ${query.from!.id}`
                );
              } catch (deleteError: unknown) {
                console.warn(
                  `[LOADER] Erro ao remover loader após callback: ${deleteError}`
                );
              } finally {
                // Limpa a referência independente do resultado
                activeLoadingAnimations.delete(query.from!.id);
              }
            }, 500);
          }
        } catch (error: unknown) {
          console.warn(
            `[LOADER] Erro ao processar remoção após callback: ${error}`
          );
        }
      }
    } catch (error) {
      // Tratamento centralizado de erros para callbacks
      botState.handlerErrors++;
      handleUserError(bot, chatId, error, "callback_processing", {
        userId: query.from.id,
        callbackData: query.data,
        baseMessage: ERROR_MESSAGES.CALLBACK
      });

      try {
        // Responde ao callback para evitar que o botão fique "carregando" para o usuário
        bot.answerCallbackQuery(query.id, {
          text: "Erro ao processar sua solicitação. Por favor, tente novamente."
        });
      } catch (answerError) {
        console.error("Erro ao responder callback após falha:", answerError);
      }
    }
  });

  // Trata erros de polling
  bot.on("polling_error", (err: Error) => {
    console.error("Erro de polling:", err);
    botState.failedRequests++;
  });

  // Marca o bot como pronto
  botState.isReady = true;
  console.log("✅ Bot inicializado e pronto para processar mensagens");

  return bot;
}

/**
 * Para a instância atual do bot, usado principalmente em testes
 * para garantir a limpeza adequada de recursos
 */
export function stopBot(): void {
  if (botInstance) {
    console.log("🔄 Parando instância do bot e liberando recursos...");

    // Interrompe o polling se estiver ativo
    try {
      if (typeof botInstance.stopPolling === "function") {
        botInstance.stopPolling();
      }
    } catch (error) {
      console.warn("Erro ao interromper polling do bot:", error);
    }

    // Limpa listeners para evitar memory leaks
    if (typeof botInstance.removeAllListeners === "function") {
      botInstance.removeAllListeners();
    }

    // Força a limpeza de todas as timers ativas relacionadas ao bot
    try {
      const TelegramBotPolling = require("node-telegram-bot-api/src/telegramPolling");
      if (TelegramBotPolling && TelegramBotPolling._polling) {
        TelegramBotPolling._polling = null;
      }
    } catch (error) {
      console.warn("Erro ao limpar polling interno:", error);
    }

    // Limpa quaisquer temporizadores pendentes
    clearAllAnimationTimers();

    // Fecha quaisquer conexões HTTP pendentes
    try {
      // Tenta acessar a propriedade interna _polling, que pode não estar na tipagem
      const bot = botInstance as any;
      if (bot._polling && typeof bot._polling._abort === "function") {
        bot._polling._abort();
      }
    } catch (error) {
      console.warn("Erro ao abortar polling:", error);
    }

    // Libera a instância
    botInstance = null;

    // Resetar o estado do bot também ajuda a limpar recursos
    resetBotState();

    console.log("✅ Bot parado e recursos liberados");
  }
}

// Exporta funções auxiliares para testes
export const _testHelpers = {
  // Função para limpar o estado de primeira interação (útil para testes)
  clearFirstInteractionState: () => {
    firstInteractionUsers.clear();
  },
  // Função para verificar se o usuário tem animação de carregamento ativa
  hasActiveLoading: (userId: number): boolean => {
    return activeLoadingAnimations.has(userId);
  },
  // Função para limpar animações de carregamento ativas
  clearActiveLoadingAnimations: () => {
    activeLoadingAnimations.clear();
  },
  // Testa o reset de estado do bot
  testResetState: () => {
    resetBotState();
    return {
      firstInteractionUsers: firstInteractionUsers.size === 0,
      activeLoadingAnimations: activeLoadingAnimations.size === 0
    };
  }
};
