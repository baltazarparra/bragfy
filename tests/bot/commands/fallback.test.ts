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
      // Configuração - mock para teste
      const mockQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        9876,
        "brag:7"
      );

      // Mock para retornar um grande conjunto de atividades
      mockActivities(existingUser.id, "week");

      // Mock para editMessageText falhar na primeira chamada
      mockBot.editMessageText.mockImplementationOnce(() => {
        throw new Error("Markdown parsing failed");
      });

      // Chama o handler
      await handleCallbackQuery(mockBot, mockQuery);

      // Assert
      // A função editMessageText será chamada várias vezes agora por causa da animação
      // Adicionar espaço para chamadas adicionais devido à função createLoadingAnimation
      // Anteriormente esperávamos 3, agora esperamos mais com a animação
      expect(mockBot.editMessageText).toHaveBeenCalled();

      // Verifique que a última chamada não tem parse_mode
      const calls = (mockBot.editMessageText as jest.Mock).mock.calls;
      const lastCallOptions = calls[calls.length - 1][1] || {};
      expect(lastCallOptions.parse_mode).toBeUndefined();
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
      // Deve verificar que a mensagem de erro correta foi enviada
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        "Desculpe, ocorreu um erro ao gerar seu Brag Document. Por favor, tente novamente mais tarde."
      );
    });
  });
});
