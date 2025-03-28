import {
  handleCallbackQuery,
  handleNewChat,
  pendingActivities
} from "../../../src/bot/commands";
import {
  createMockBot,
  createMessage,
  createCallbackQuery,
  mockExistingUser,
  mockActivities,
  setupMocksBeforeEach,
  mocks
} from "../setup";

describe("Fluxo de Atividades", () => {
  let mockBot: any;
  let existingUser: any;

  beforeEach(() => {
    setupMocksBeforeEach();
    mockBot = createMockBot();
    existingUser = mockExistingUser(123456789);
  });

  describe("Nova atividade", () => {
    it("deve iniciar o registro de nova atividade", async () => {
      // Arrange
      const msg = createMessage(123456789, 123456789, "/nova_atividade");

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Recebi sua atividade"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });

    it("deve iniciar o registro de nova atividade com shortcut /na", async () => {
      // Arrange
      const msg = createMessage(123456789, 123456789, "/na");

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Recebi sua atividade"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });

    it("deve registrar a descrição da atividade e perguntar a urgência", async () => {
      // Arrange
      const msg = createMessage(
        123456789,
        123456789,
        "Implementei nova funcionalidade"
      );

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Recebi sua atividade"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });

    it("deve registrar a urgência e perguntar o impacto", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "urgency:high:1234"
      );
      const messageId = 1234;
      pendingActivities.set(messageId, {
        userId: existingUser.id,
        content: "Implementei nova funcionalidade"
      });

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Qual é o impacto desta atividade?"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
      expect(pendingActivities.get(messageId)).toEqual(
        expect.objectContaining({
          content: "Implementei nova funcionalidade",
          urgency: "high"
        })
      );
    });

    it("deve registrar o impacto e criar a atividade", async () => {
      // Arrange
      const messageId = 1234;
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        `impact:high:${messageId}`
      );
      pendingActivities.set(messageId, {
        userId: existingUser.id,
        content: "Implementei nova funcionalidade",
        urgency: "high"
      });

      (mocks.createActivity as jest.Mock).mockResolvedValue({
        id: "activity-id",
        description: "Implementei nova funcionalidade",
        urgency: "high",
        impact: "high",
        userId: existingUser.id,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mocks.createActivity).toHaveBeenCalledWith(
        existingUser.id,
        "Implementei nova funcionalidade",
        "high",
        "high"
      );

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("✅ Atividade registrada com sucesso!"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: callbackQuery.message?.message_id
        })
      );

      expect(pendingActivities.has(messageId)).toBe(false);
    });

    it("deve iniciar confirmação de atividade", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "confirm:Implementei nova funcionalidade"
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Qual é a urgência desta atividade?"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
      // Verificar que a atividade foi armazenada no mapa
      expect(pendingActivities.has(callbackQuery.message!.message_id)).toBe(
        true
      );
    });

    it("deve permitir edição de atividade", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        9876,
        "edit"
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        "✏️ Por favor, envie sua mensagem corrigida.",
        expect.objectContaining({
          chat_id: 123456789,
          message_id: 9876
        })
      );
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith("query123");
    });

    it("deve permitir cancelamento de atividade", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        9876,
        "cancel"
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        "❌ Registro de atividade cancelado.",
        expect.objectContaining({
          chat_id: 123456789,
          message_id: 9876
        })
      );
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith("query123");
    });

    it("deve tratar erros durante o registro de atividade", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        1234,
        "impact:high:1234"
      );

      // Adicionar atividade pendente no mapa
      pendingActivities.set(1234, {
        userId: 42, // existingUser.id
        content: "Implementei nova funcionalidade",
        urgency: "high"
      });

      // Mock para erro ao criar atividade
      (mocks.createActivity as jest.Mock).mockRejectedValue(
        new Error("Erro ao criar atividade")
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        "Erro ao registrar sua atividade. Por favor, tente novamente."
      );
    });
  });

  describe("Validações", () => {
    it("deve rejeitar confirmação de usuário que não existe", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        9876,
        "confirm:Atividade teste"
      );

      // Simular usuário não encontrado
      (mocks.userExists as jest.Mock).mockResolvedValue(false);

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Opa! Parece que tivemos um problema")
      );
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        "query123",
        expect.objectContaining({
          text: "Erro: cadastro não encontrado"
        })
      );
    });

    it("deve tratar erro ao processar callback de urgência com ID de mensagem inválido", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        9876,
        "urgency:high:99999" // ID que não existe no mapa
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        "query123",
        expect.objectContaining({
          text: "Erro: atividade não encontrada"
        })
      );
    });
  });
});
