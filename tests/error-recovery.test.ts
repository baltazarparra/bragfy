/**
 * Teste para verificar a capacidade de recuperação de erros do bot
 *
 * Este script simula uma condição de erro e verifica se o bot consegue
 * se recuperar adequadamente ao receber um comando /start
 */

import TelegramBot from "node-telegram-bot-api";
import { initBot, resetBotState, botState, stopBot } from "../src/bot";
import { handleUserError } from "../src/utils/errorUtils";
import {
  pendingActivities,
  onboardingInProgress,
  clearAllAnimationTimers
} from "../src/bot/commands";
import dotenv from "dotenv";

// Configurar variável de ambiente para testes
process.env.NODE_ENV = "test";

// Carrega variáveis de ambiente do .env
dotenv.config();

// Configuração
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
let bot: TelegramBot;

// Mock para um objeto de mensagem do Telegram
const createMockMessage = (
  userId: number,
  chatId: number,
  text: string = "/start"
) => {
  return {
    message_id: Math.floor(Math.random() * 1000),
    from: {
      id: userId,
      is_bot: false,
      first_name: "TestUser",
      username: "test_user"
    },
    chat: {
      id: chatId,
      type: "private",
      first_name: "TestUser",
      username: "test_user"
    },
    date: Math.floor(Date.now() / 1000),
    text
  } as TelegramBot.Message;
};

/**
 * Simula um estado corrompido no bot
 */
function simulateCorruptedState() {
  // Adiciona várias atividades pendentes falsas
  for (let i = 0; i < 5; i++) {
    pendingActivities.set(i, {
      userId: 12345,
      content: `Atividade corrupta ${i}`
    });
  }

  // Marca vários usuários como em onboarding
  for (let i = 0; i < 3; i++) {
    onboardingInProgress.set(i, true);
  }

  // Simula erros acumulados
  botState.handlerErrors = 10;
  botState.failedRequests = 5;

  console.log("Estado corrompido:", {
    pendingActivities: pendingActivities.size,
    onboardingInProgress: onboardingInProgress.size,
    handlerErrors: botState.handlerErrors,
    failedRequests: botState.failedRequests
  });
}

describe("Recuperação de erros com fallback", () => {
  afterEach(() => {
    // Limpa todos os temporizadores após cada teste para evitar vazamentos
    clearAllAnimationTimers();

    // Para a instância do bot
    stopBot();
  });

  it("deve recuperar de estado corrompido e tratar erros com trace ID", async () => {
    console.log("🧪 Iniciando teste de recuperação de erros...");

    // Inicializa o bot
    bot = initBot(BOT_TOKEN);

    // Verificação inicial
    console.log("✅ Bot inicializado");
    console.log("Estado inicial:", JSON.stringify(botState, null, 2));

    // Simula um estado corrompido
    simulateCorruptedState();
    console.log("🔥 Estado interno corrompido simulado");

    // Registra handlers originais
    const originalSendMessage = bot.sendMessage;

    // Mock para sendMessage para capturar resultados
    let errorMessageSent = false;
    let traceIdFound: string | null = null;

    bot.sendMessage = function (chatId: number, text: string, options?: any) {
      console.log(
        `[MOCK] sendMessage para ${chatId}: ${text.substring(0, 50)}...`
      );
      if (text.includes("Código:")) {
        errorMessageSent = true;
        // Extrai o trace ID
        const match = text.match(/Código: ([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          traceIdFound = match[1];
          console.log(`[MOCK] Trace ID encontrado: ${traceIdFound}`);
        }
      }
      return Promise.resolve({} as any);
    };

    // Simula um erro sendo tratado pelo mecanismo centralizado
    console.log("🧪 Testando tratamento de erro centralizado...");
    await handleUserError(
      bot,
      12345,
      new Error("Erro de teste simulado"),
      "error_recovery_test",
      {
        userId: 98765,
        messageText: "Mensagem de teste"
      }
    );

    // Verifica se a mensagem de erro com trace ID foi enviada
    console.log(`✅ Mensagem de erro enviada: ${errorMessageSent}`);
    console.log(`✅ Trace ID encontrado: ${traceIdFound}`);
    expect(errorMessageSent).toBe(true);
    expect(traceIdFound).toBeTruthy();

    // Restaura o handler original
    bot.sendMessage = originalSendMessage;

    // Simula o envio de um comando /start para resetar o estado
    console.log("🧪 Enviando comando /start para recuperar o estado...");
    resetBotState();

    // Verifica se o estado foi reiniciado corretamente
    console.log("Estado após reset:", JSON.stringify(botState, null, 2));
    console.log(
      `Pendências: ${pendingActivities.size} atividades, ${onboardingInProgress.size} onboardings`
    );

    // Verificações adicionais para o Jest
    expect(pendingActivities.size).toBe(0);
    expect(onboardingInProgress.size).toBe(0);
    expect(botState.handlerErrors).toBe(0);
    expect(botState.failedRequests).toBe(0);

    console.log("✅ Teste de recuperação de erros concluído!");
  });
});

describe("Recuperação de erros do bot", () => {
  afterEach(() => {
    // Limpa todos os temporizadores após cada teste para evitar vazamentos
    clearAllAnimationTimers();

    // Para a instância do bot
    stopBot();
  });

  it("deve recuperar de estado corrompido e tratar erros com trace ID", async () => {
    console.log("🧪 Iniciando teste de recuperação de erros...");

    // Inicializa o bot
    bot = initBot(BOT_TOKEN);

    // Verificação inicial
    console.log("✅ Bot inicializado");
    console.log("Estado inicial:", JSON.stringify(botState, null, 2));

    // Simula um estado corrompido
    simulateCorruptedState();
    console.log("🔥 Estado interno corrompido simulado");

    // Registra handlers originais
    const originalSendMessage = bot.sendMessage;

    // Mock para sendMessage para capturar resultados
    let errorMessageSent = false;
    let traceIdFound: string | null = null;

    bot.sendMessage = function (chatId: number, text: string, options?: any) {
      console.log(
        `[MOCK] sendMessage para ${chatId}: ${text.substring(0, 50)}...`
      );
      if (text.includes("Código:")) {
        errorMessageSent = true;
        // Extrai o trace ID
        const match = text.match(/Código: ([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          traceIdFound = match[1];
          console.log(`[MOCK] Trace ID encontrado: ${traceIdFound}`);
        }
      }
      return Promise.resolve({} as any);
    };

    // Simula um erro sendo tratado pelo mecanismo centralizado
    console.log("🧪 Testando tratamento de erro centralizado...");
    await handleUserError(
      bot,
      12345,
      new Error("Erro de teste simulado"),
      "error_recovery_test",
      {
        userId: 98765,
        messageText: "Mensagem de teste"
      }
    );

    // Verifica se a mensagem de erro com trace ID foi enviada
    console.log(`✅ Mensagem de erro enviada: ${errorMessageSent}`);
    console.log(`✅ Trace ID encontrado: ${traceIdFound}`);
    expect(errorMessageSent).toBe(true);
    expect(traceIdFound).toBeTruthy();

    // Restaura o handler original
    bot.sendMessage = originalSendMessage;

    // Simula o envio de um comando /start para resetar o estado
    console.log("🧪 Enviando comando /start para recuperar o estado...");
    resetBotState();

    // Verifica se o estado foi reiniciado corretamente
    console.log("Estado após reset:", JSON.stringify(botState, null, 2));
    console.log(
      `Pendências: ${pendingActivities.size} atividades, ${onboardingInProgress.size} onboardings`
    );

    // Verificações adicionais para o Jest
    expect(pendingActivities.size).toBe(0);
    expect(onboardingInProgress.size).toBe(0);
    expect(botState.handlerErrors).toBe(0);
    expect(botState.failedRequests).toBe(0);

    console.log("✅ Teste de recuperação de erros concluído!");
  });
});
