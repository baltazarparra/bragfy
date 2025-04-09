import { Request, Response } from "express";
import { getUserByTelegramId } from "../../src/utils/userUtils";
import { createLinkReadyHandler } from "../../src/api/link-ready";

// Mock do módulo userUtils
jest.mock("../../src/utils/userUtils", () => ({
  getUserByTelegramId: jest.fn()
}));

// Mock do TelegramBot
const mockBotSendMessage = jest.fn().mockResolvedValue(true);
const mockBot = {
  sendMessage: mockBotSendMessage
};

describe("API Endpoint: /api/link-ready", () => {
  // Handler criado com o bot mockado
  const handleLinkReady = createLinkReadyHandler(mockBot as any);

  beforeEach(() => {
    // Reset dos mocks
    jest.clearAllMocks();

    // Mock dos console methods para testes
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("deve retornar 200 e enviar mensagem quando usuário é encontrado", async () => {
    // Mock para response
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    // Mock para request
    const mockRequest = {
      body: {
        userId: 123456789,
        url: "https://exemplo.com/brag-doc"
      }
    } as Request;

    // Configura o mock para retornar um usuário
    (getUserByTelegramId as jest.Mock).mockResolvedValue({
      id: 1,
      telegramId: 123456789,
      firstName: "Usuário",
      lastName: "Teste"
    });

    // Executa o handler
    await handleLinkReady(mockRequest, mockResponse);

    // Verifica se o status é 200
    expect(mockResponse.status).toHaveBeenCalledWith(200);

    // Verifica se a resposta é { success: true }
    expect(mockResponse.json).toHaveBeenCalledWith({ success: true });

    // Verifica se a mensagem foi enviada
    expect(mockBotSendMessage).toHaveBeenCalledWith(
      123456789,
      "Seu Brag Document está pronto! ✨\n\n🔗 https://exemplo.com/brag-doc"
    );
  });

  it("deve retornar 404 quando usuário não é encontrado", async () => {
    // Mock para response
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    // Mock para request
    const mockRequest = {
      body: {
        userId: 123456789,
        url: "https://exemplo.com/brag-doc"
      }
    } as Request;

    // Configura o mock para não encontrar o usuário
    (getUserByTelegramId as jest.Mock).mockResolvedValue(null);

    // Executa o handler
    await handleLinkReady(mockRequest, mockResponse);

    // Verifica se o status é 404
    expect(mockResponse.status).toHaveBeenCalledWith(404);

    // Verifica se a resposta indica usuário não encontrado
    expect(mockResponse.json).toHaveBeenCalledWith({ error: "User not found" });

    // Verifica que nenhuma mensagem foi enviada
    expect(mockBotSendMessage).not.toHaveBeenCalled();
  });

  it("deve retornar 400 quando parâmetros são inválidos", async () => {
    // Mock para response
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    // Mock para request com dados incompletos
    const mockRequest = {
      body: {
        // userId faltando
        url: "https://exemplo.com/brag-doc"
      }
    } as Request;

    // Executa o handler
    await handleLinkReady(mockRequest, mockResponse);

    // Verifica se o status é 400
    expect(mockResponse.status).toHaveBeenCalledWith(400);

    // Verifica se a resposta indica parâmetros inválidos
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Parâmetros inválidos"
    });
  });
});
