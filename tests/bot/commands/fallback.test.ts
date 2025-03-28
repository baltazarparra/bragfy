import { handleCallbackQuery } from "../../../src/bot/commands";
import {
  createCallbackQuery,
  createMockBot,
  mockExistingUser,
  mockActivities,
  setupMocksBeforeEach,
  mocks
} from "../setup";

describe("Tratamento de Erros e Fluxos Inválidos", () => {
  let mockBot: any;
  let existingUser: any;

  beforeEach(() => {
    setupMocksBeforeEach();
    mockBot = createMockBot();
    existingUser = mockExistingUser(123456789);
  });

  describe("Callbacks inválidos", () => {
    it("deve tratar callback com dados incompletos", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "invalid_callback_data"
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        callbackQuery.id,
        expect.objectContaining({
          text: expect.stringContaining("Ação desconhecida")
        })
      );
    });

    it("deve tratar callback com dados desconhecidos", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "unknown_action_unknown_data"
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        callbackQuery.id,
        expect.objectContaining({
          text: expect.stringContaining("Ação desconhecida")
        })
      );
    });

    it("deve tratar período inválido para callback brag", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "brag:invalid"
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        callbackQuery.id,
        expect.objectContaining({
          text: expect.stringContaining("Período inválido")
        })
      );
    });

    it("deve tratar período inválido para callback pdf", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "pdf:invalid"
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        callbackQuery.id,
        expect.objectContaining({
          text: expect.stringContaining("Período inválido")
        })
      );
    });
  });

  describe("Erros gerais", () => {
    it("deve tratar erros gerais durante processamento de callbacks", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "brag:7"
      );

      // Forçar um erro inesperado
      (mocks.getUserByTelegramId as jest.Mock).mockImplementation(() => {
        throw new Error("Erro inesperado");
      });

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        callbackQuery.id,
        expect.objectContaining({
          text: expect.stringContaining("Ocorreu um erro")
        })
      );
    });

    it("deve tratar erros ao renderizar markdown complexo", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        1234,
        "brag:7"
      );

      // Simular atividades
      mockActivities(existingUser.id, "week");

      // Simular erro de renderização
      (mocks.generateBragDocument as jest.Mock).mockReturnValue(
        "*Texto com _markdown_ mal formado"
      );

      let callCount = 0;
      jest
        .spyOn(mockBot, "editMessageText")
        .mockImplementation((text, options: any) => {
          callCount++;
          if (callCount === 1) {
            // Primeira chamada - atualiza para mostrar que está gerando
            return Promise.resolve({});
          } else if (options.parse_mode === "Markdown") {
            throw new Error("Markdown inválido");
          }
          return Promise.resolve({});
        });

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      // Deve verificar que a função foi chamada pelo menos 3 vezes
      expect(mockBot.editMessageText).toHaveBeenCalledTimes(3);

      // Verifique que a última chamada não tem parse_mode
      const calls = (mockBot.editMessageText as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].parse_mode).toBeUndefined();
    });

    it("deve tratar erros ao enviar mensagens", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        1234,
        "brag:7"
      );

      // Simular atividades
      mockActivities(existingUser.id, "week");

      // Forçar erro no envio
      jest
        .spyOn(mockBot, "editMessageText")
        .mockRejectedValue(new Error("Erro de conexão"));

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      // Deve verificar que fallback foi chamado
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        "Erro ao gerar Brag Document. Por favor, tente novamente."
      );
    });
  });
});
