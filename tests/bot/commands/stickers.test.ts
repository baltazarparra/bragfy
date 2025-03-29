import { sendRandomSticker } from "../../../src/bot/commands";
import {
  getRandomStickerFor,
  sendStickerSafely
} from "../../../src/utils/stickerUtils";
import TelegramBot from "node-telegram-bot-api";
import { setupMocksBeforeEach, mocks, createMockBot } from "../setup";

// Mock de getRandomSticker e getRandomStickerFor
jest.mock("../../../src/utils/stickerUtils", () => ({
  getRandomStickerFor: jest.fn(),
  sendStickerSafely: jest.fn()
}));

describe("Funções de envio de stickers", () => {
  describe("sendRandomSticker", () => {
    let mockBot: any;

    beforeEach(() => {
      // Reset dos mocks
      jest.clearAllMocks();
      setupMocksBeforeEach();

      // Mock do console para não poluir a saída
      jest.spyOn(console, "log").mockImplementation(() => {});
      jest.spyOn(console, "warn").mockImplementation(() => {});

      // Mock do bot
      mockBot = createMockBot();

      // Mock do sendStickerSafely
      (sendStickerSafely as jest.Mock).mockResolvedValue(true);
    });

    it("deve chamar sendStickerSafely com os parâmetros corretos", async () => {
      // Arrange
      const chatId = 123456789;

      // Act
      await sendRandomSticker(mockBot, chatId, "onboarding");

      // Assert
      expect(sendStickerSafely).toHaveBeenCalledWith(
        mockBot,
        chatId,
        "onboarding"
      );
    });

    it("deve tratar erros do sendStickerSafely", async () => {
      // Arrange
      const chatId = 123456789;
      const mockError = new Error("Erro ao enviar sticker");

      // Mock para simular falha
      (sendStickerSafely as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      // Não deve lançar exceção
      await expect(
        sendRandomSticker(mockBot, chatId, "onboarding")
      ).resolves.not.toThrow();
      expect(sendStickerSafely).toHaveBeenCalledWith(
        mockBot,
        chatId,
        "onboarding"
      );
      expect(console.warn).toHaveBeenCalled(); // Deve logar o erro
    });
  });
});
