/// <reference types="jest" />
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { resetBotState, botState } from "../src/bot";
import { pendingActivities, onboardingInProgress } from "../src/bot/commands";
import { handleUserError, generateTraceId } from "../src/utils/errorUtils";
import TelegramBot from "node-telegram-bot-api";

// Mock dos módulos
jest.mock("node-telegram-bot-api");
jest.mock("../src/utils/errorUtils", () => {
  return {
    handleUserError: jest.fn().mockReturnValue("mock-trace-id"),
    generateTraceId: jest.fn().mockReturnValue("mock-trace-id")
  };
});

describe("Recuperação do Bot após Erros", () => {
  // Limpa os mocks e estados antes de cada teste
  beforeEach(() => {
    jest.clearAllMocks();
    resetBotState();
  });

  it("deve resetar o estado interno do bot corretamente", () => {
    // Configura um estado corrupto
    botState.handlerErrors = 10;
    botState.failedRequests = 5;

    // Adiciona atividades pendentes falsas
    for (let i = 0; i < 5; i++) {
      pendingActivities.set(i, {
        userId: 12345,
        content: `Atividade corrupta ${i}`
      });
    }

    // Marca usuários como em onboarding
    for (let i = 0; i < 3; i++) {
      onboardingInProgress.set(i, true);
    }

    // Verifica o estado corrupto
    expect(pendingActivities.size).toBe(5);
    expect(onboardingInProgress.size).toBe(3);
    expect(botState.handlerErrors).toBe(10);
    expect(botState.failedRequests).toBe(5);

    // Executa a função de reset
    resetBotState();

    // Verifica se o estado foi limpo
    expect(pendingActivities.size).toBe(0);
    expect(onboardingInProgress.size).toBe(0);
    expect(botState.handlerErrors).toBe(0);
    expect(botState.failedRequests).toBe(0);
  });

  it("deve gerar IDs de rastreamento para erros", () => {
    // Testa a geração de ID de rastreamento
    const traceId = generateTraceId();
    expect(traceId).toBe("mock-trace-id");
  });

  it("deve usar handleUserError para reportar erros com trace ID", async () => {
    // Cria um bot mock
    const mockBot = {
      sendMessage: jest.fn().mockResolvedValue({})
    };

    // Testa o tratamento de erro
    const result = await handleUserError(
      mockBot as any,
      12345,
      new Error("Erro de teste"),
      "test_context",
      {
        userId: 67890,
        messageText: "Mensagem de teste"
      }
    );

    // Verifica se a função foi chamada corretamente
    expect(handleUserError).toHaveBeenCalled();
    expect(result).toBe("mock-trace-id");
  });
});
