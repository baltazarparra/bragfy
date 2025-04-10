import TelegramBot from "node-telegram-bot-api";
import {
  handleStartCommand,
  handleNewChat,
  handleCallbackQuery,
  createLoadingAnimation
} from "./commands";

// Map para rastrear se é a primeira interação do usuário na sessão atual
const firstInteractionUsers = new Map<number, boolean>();

// Map para controlar animações de carregamento ativas
const activeLoadingAnimations = new Map<
  number,
  { messageId: number; chatId: number }
>();

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

  // Limpa o Map de primeiras interações ao iniciar o bot
  firstInteractionUsers.clear();

  // Limpa o Map de animações de carregamento
  activeLoadingAnimations.clear();

  // Registra handler para o comando /start com parâmetro opcional
  bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
    const source = match ? match[1] : undefined;
    handleStartCommand(bot, msg, source);
  });

  // Registra handler para todas as mensagens
  bot.on("message", async (msg) => {
    // Ignora comandos
    if (msg.text && msg.text.startsWith("/")) return;

    // Verifica se há um usuário válido na mensagem
    if (!msg.from || !msg.from.id) return;

    const userId = msg.from.id;
    const chatId = msg.chat.id;

    // Simula digitação antes de enviar a mensagem
    await bot.sendChatAction(msg.chat.id, "typing");

    // Verifica se é a primeira interação do usuário nesta sessão
    if (!firstInteractionUsers.has(userId)) {
      // Marca que o usuário já interagiu nesta sessão
      firstInteractionUsers.set(userId, true);

      try {
        // Envia mensagem de loader para qualquer mensagem (não apenas primeira interação)
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

          // Adiciona animação ao loader
          createLoadingAnimation(
            bot,
            chatId,
            loaderMsg.message_id,
            "Ainda estou acordando",
            2
          );
        }
      } catch (error) {
        console.warn(`Erro ao enviar loader para usuário ${userId}:`, error);
      }
    } else {
      // Para usuários que já interagiram, envia um loader mais curto
      try {
        // Envia "Registrando atividade..." com loader
        const loaderMsg = await bot.sendMessage(
          chatId,
          "Registrando atividade..."
        );

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
            "Registrando atividade",
            1
          );
        }
      } catch (error) {
        console.warn(`Erro ao enviar loader para usuário ${userId}:`, error);
      }
    }

    // Processa nova mensagem
    await handleNewChat(bot, msg);

    // Tenta remover a mensagem de carregamento após processar a mensagem
    try {
      const loadingInfo = activeLoadingAnimations.get(userId);
      if (loadingInfo) {
        // Aguarda um pequeno tempo para garantir que a resposta principal foi enviada
        setTimeout(async () => {
          try {
            await bot.deleteMessage(loadingInfo.chatId, loadingInfo.messageId);
            console.log(`[LOADER] Removido com sucesso para ${userId}`);
          } catch (deleteError) {
            console.warn(`[LOADER] Erro ao remover loader: ${deleteError}`);
          } finally {
            // Limpa a referência independente do resultado
            activeLoadingAnimations.delete(userId);
          }
        }, 500);
      }
    } catch (error) {
      console.warn(`[LOADER] Erro ao processar remoção: ${error}`);
    }
  });

  // Registra handler para callbacks de botões inline
  bot.on("callback_query", (query) => {
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
            } catch (deleteError) {
              console.warn(
                `[LOADER] Erro ao remover loader após callback: ${deleteError}`
              );
            } finally {
              // Limpa a referência independente do resultado
              activeLoadingAnimations.delete(query.from!.id);
            }
          }, 500);
        }
      } catch (error) {
        console.warn(
          `[LOADER] Erro ao processar remoção após callback: ${error}`
        );
      }
    }
  });

  // Trata erros
  bot.on("polling_error", (err) => {
    console.error("Erro de polling:", err);
  });

  return bot;
};

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
  }
};
