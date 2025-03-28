import { sendRandomSticker } from "../../../src/bot/commands";
import { getRandomSticker } from "../../../src/bot/stickers";
import { getRandomStickerFor } from "../../../src/utils/stickerUtils";
import TelegramBot from "node-telegram-bot-api";

// Mock de getRandomSticker e getRandomStickerFor
jest.mock("../../../src/bot/stickers", () => ({
  getRandomSticker: jest.fn()
}));

jest.mock("../../../src/utils/stickerUtils", () => ({
  getRandomStickerFor: jest.fn()
}));

describe("Funções de envio de stickers", () => {
  describe("sendRandomSticker", () => {
    let mockBot: any;

    beforeEach(() => {
      // Reset dos mocks
      jest.clearAllMocks();

      // Mock do console para não poluir a saída
      jest.spyOn(console, "log").mockImplementation(() => {});
      jest.spyOn(console, "warn").mockImplementation(() => {});

      // Mock do bot
      mockBot = {
        sendSticker: jest.fn().mockResolvedValue({})
      };
    });

    it("deve enviar um sticker quando há um sticker disponível", async () => {
      // Arrange
      const chatId = 123456789;
      const mockStickerId = "STICKER_ID_MOCK";

      // Mock para retornar um sticker específico da nova função
      (getRandomStickerFor as jest.Mock).mockReturnValue(mockStickerId);
      (getRandomSticker as jest.Mock).mockReturnValue(undefined);

      // Act
      await sendRandomSticker(mockBot, chatId, "onboarding");

      // Assert
      expect(getRandomStickerFor).toHaveBeenCalledWith("onboarding");
      expect(mockBot.sendSticker).toHaveBeenCalledWith(chatId, mockStickerId);
    });

    it("não deve chamar sendSticker quando nenhum sticker está disponível", async () => {
      // Arrange
      const chatId = 123456789;

      // Ambas funções retornam undefined (nenhum sticker disponível)
      (getRandomStickerFor as jest.Mock).mockReturnValue(undefined);
      (getRandomSticker as jest.Mock).mockReturnValue(undefined);

      // Act
      await sendRandomSticker(mockBot, chatId, "onboarding");

      // Assert
      expect(getRandomStickerFor).toHaveBeenCalledWith("onboarding");
      expect(mockBot.sendSticker).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled(); // Deve logar um aviso
    });

    it("deve tratar erros durante o envio do sticker", async () => {
      // Arrange
      const chatId = 123456789;
      const mockStickerId = "STICKER_ID_MOCK";
      const mockError = new Error("Erro ao enviar sticker");

      // Mock para retornar um sticker da nova função
      (getRandomStickerFor as jest.Mock).mockReturnValue(mockStickerId);
      (getRandomSticker as jest.Mock).mockReturnValue(undefined);

      // Mock para simular falha no envio
      mockBot.sendSticker.mockRejectedValue(mockError);

      // Act & Assert
      // Não deve lançar exceção
      await expect(
        sendRandomSticker(mockBot, chatId, "onboarding")
      ).resolves.not.toThrow();
      expect(getRandomStickerFor).toHaveBeenCalledWith("onboarding");
      expect(mockBot.sendSticker).toHaveBeenCalledWith(chatId, mockStickerId);
      expect(console.warn).toHaveBeenCalled(); // Deve logar o erro
    });
  });
});
