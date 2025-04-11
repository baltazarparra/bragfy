/// <reference types="jest" />
import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect
} from "@jest/globals";
import TelegramBot from "node-telegram-bot-api";
import { handleNewChat, clearAllAnimationTimers } from "../src/bot/commands";
import { createUserErrorMessage } from "../src/utils/errorUtils";
import { getUserByTelegramId, userExists } from "../src/utils/userUtils";
import { stopBot } from "../src/bot";

// Mock dos módulos necessários
jest.mock("node-telegram-bot-api");
jest.mock("../src/utils/userUtils");
jest.mock("../src/utils/errorUtils", () => {
  const originalModule = jest.requireActual("../src/utils/errorUtils");
  return {
    ...originalModule,
    handleUserError: jest
      .fn()
      .mockImplementation(
        (bot: any, chatId: any, error: any, context: any, info: any) => {
          // Gera um trace ID fixo para teste
          const traceId = "mock-trace-id";

          // Simula o envio de mensagem de erro COM o trace ID
          const errorMessage = `${originalModule.ERROR_MESSAGES.MESSAGE_PROCESSING}. Por favor, tente novamente ou use o comando /start para reiniciar a conversa.\n\nCódigo: ${traceId}`;
          bot.sendMessage(chatId, errorMessage);

          return traceId;
        }
      )
  };
});

describe("Tratamento de Mensagens e Fallbacks", () => {
  let mockBot: any;

  beforeEach(() => {
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      sendChatAction: jest.fn().mockResolvedValue({}),
      deleteMessage: jest.fn().mockResolvedValue({})
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Limpa todos os temporizadores após cada teste para evitar vazamentos
    clearAllAnimationTimers();

    // Para a instância do bot
    stopBot();
  });

  it("deve incluir um ID de rastreamento nas mensagens de erro", () => {
    // Verifica se a função cria uma mensagem com trace ID
    const errorMessage = createUserErrorMessage("abc123", "Mensagem de erro");
    expect(errorMessage).toContain("abc123");
    expect(errorMessage).toContain("Mensagem de erro");
  });

  it("deve exibir mensagem de fallback com trace ID quando ocorre um erro", async () => {
    // Configura mocks para simular um erro
    (
      userExists as unknown as { mockRejectedValue: (error: Error) => void }
    ).mockRejectedValue(new Error("Erro de banco de dados simulado"));

    // Cria mensagem simulada
    const mockMessage: any = {
      chat: { id: 123456 },
      from: { id: 789012, first_name: "Usuário", is_bot: false }
    };

    // Executa a função que deve falhar
    await handleNewChat(mockBot, mockMessage);

    // Verifica se a mensagem de erro foi enviada com trace ID
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      123456,
      expect.stringContaining("Código: mock-trace-id")
    );
  });

  it("deve lidar com inconsistências no banco de dados", async () => {
    // Configura mocks para simular uma inconsistência onde o usuário existe mas não é encontrado
    (
      userExists as unknown as { mockResolvedValue: (value: boolean) => void }
    ).mockResolvedValue(true);
    (
      getUserByTelegramId as unknown as {
        mockResolvedValue: (value: any) => void;
      }
    ).mockResolvedValue(null);

    // Cria mensagem simulada
    const mockMessage: any = {
      chat: { id: 123456 },
      from: { id: 789012, first_name: "Usuário", is_bot: false }
    };

    // Executa a função
    await handleNewChat(mockBot, mockMessage);

    // Verifica se a mensagem apropriada foi enviada
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      123456,
      expect.stringContaining("Não foi possível recuperar seus dados")
    );
  });
});
