import { initBot } from "../../src/bot";
import TelegramBot from "node-telegram-bot-api";

// Mock TelegramBot
jest.mock("node-telegram-bot-api");

describe("initBot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve configurar handlers de mensagens corretamente", async () => {
    // Arrange
    const mockOn = jest.fn();
    const mockOnText = jest.fn();
    const mockSendMessage = jest.fn().mockResolvedValue({});
    const mockSendChatAction = jest.fn().mockResolvedValue(true);

    // Mock do construtor do TelegramBot
    (TelegramBot as jest.MockedClass<typeof TelegramBot>).mockImplementation(
      () =>
        ({
          on: mockOn,
          onText: mockOnText,
          sendMessage: mockSendMessage,
          sendChatAction: mockSendChatAction
        }) as unknown as TelegramBot
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
      text: "mensagem normal"
    };

    // Dispara o handler (agora assíncrono)
    await messageHandler(mockMsg);

    // Verifica se enviou a ação de digitação
    expect(mockSendChatAction).toHaveBeenCalledWith(123, "typing");

    // Verifica se enviou a mensagem de loader
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      "Ainda estou acordando..."
    );

    // Simula um comando /start
    const mockStartMsg = {
      chat: { id: 123 },
      text: "/start"
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
