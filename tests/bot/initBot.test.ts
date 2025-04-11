import { initBot, stopBot } from "../../src/bot";
import TelegramBot from "node-telegram-bot-api";
import * as userUtils from "../../src/utils/userUtils";
import { resetBotState } from "../../src/bot/index";
import { clearAllAnimationTimers } from "../../src/bot/commands";
import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect
} from "@jest/globals";

// Mock TelegramBot
jest.mock("node-telegram-bot-api");
// Mock de utils
jest.mock("../../src/utils/userUtils");

describe("initBot", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configure o mock para retornar um usuário existente por padrão
    (userUtils.userExists as any).mockResolvedValue(true);
    (userUtils.getUserByTelegramId as any).mockResolvedValue({
      id: 1,
      telegramId: 456,
      firstName: "Test",
      lastName: null,
      username: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  afterEach(() => {
    // Limpa todos os temporizadores após cada teste para evitar vazamentos
    clearAllAnimationTimers();

    // Para a instância do bot para evitar vazamentos de polling
    stopBot();
  });

  it("deve configurar handlers de mensagens corretamente", async () => {
    // Arrange
    const mockOn = jest.fn();
    const mockOnText = jest.fn();
    const mockSendMessage = jest
      .fn()
      .mockResolvedValue({ message_id: 123 } as any);
    const mockSendChatAction = jest.fn().mockResolvedValue(true as any);
    const mockEditMessageText = jest.fn().mockResolvedValue({} as any);

    // Mock do construtor do TelegramBot
    (TelegramBot as any).mockImplementation(
      () =>
        ({
          on: mockOn,
          onText: mockOnText,
          sendMessage: mockSendMessage,
          sendChatAction: mockSendChatAction,
          editMessageText: mockEditMessageText
        }) as any
    );

    // Act
    initBot("fake-token");

    // Assert
    // Verifica se registrou handlers para message e callback_query
    expect(mockOn).toHaveBeenCalledWith("message", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("callback_query", expect.any(Function));

    // Obtém o handler da mensagem
    const messageHandlers = mockOn.mock.calls.filter(
      (call) => call[0] === "message"
    );
    expect(messageHandlers.length).toBe(1);

    const messageHandler = messageHandlers[0][1];

    // Simula uma mensagem normal
    const mockMsg = {
      chat: { id: 123 },
      text: "mensagem normal",
      from: { id: 456, first_name: "Test", is_bot: false }
    };

    // Dispara o handler (agora assíncrono)
    await messageHandler(mockMsg);

    // Verifica se enviou a ação de digitação
    expect(mockSendChatAction).toHaveBeenCalledWith(123, "typing");

    // Verifica se enviou a mensagem de loader (primeira interação)
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      "Ainda estou acordando..."
    );

    // Verifica se tentou chamar editMessageText para a animação
    expect(mockEditMessageText).toHaveBeenCalled();

    // Reseta os mocks para o segundo teste
    mockSendChatAction.mockClear();
    mockSendMessage.mockClear();
    mockEditMessageText.mockClear();

    // Simula uma segunda mensagem do mesmo usuário
    await messageHandler(mockMsg);

    // Verifica se enviou a ação de digitação novamente
    expect(mockSendChatAction).toHaveBeenCalledWith(123, "typing");

    // Verifica que NÃO enviou a mensagem de loader na segunda interação
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      123,
      "Ainda estou acordando..."
    );

    // Simula um comando /start
    const mockStartMsg = {
      chat: { id: 123 },
      text: "/start",
      from: { id: 456, first_name: "Test", is_bot: false }
    };

    // Reseta os mocks
    mockSendChatAction.mockClear();
    mockSendMessage.mockClear();

    // Dispara o handler para o comando /start
    await messageHandler(mockStartMsg);

    // Verifica que não enviou a ação de digitação para /start
    expect(mockSendChatAction).not.toHaveBeenCalled();

    // Verifica que não enviou a mensagem de loader para /start
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
