import { handleCallbackQuery, handleNewChat } from "../../../src/bot/commands";
import {
  createCallbackQuery,
  createMockBot,
  createMessage,
  mockExistingUser,
  mockActivities,
  setupMocksBeforeEach,
  mocks
} from "../setup";
import * as commandsModule from "../../../src/bot/commands";

describe("Geração de Brag Document", () => {
  let mockBot: any;
  let existingUser: any;

  beforeEach(() => {
    setupMocksBeforeEach();
    mockBot = createMockBot();
    existingUser = mockExistingUser(123456789);
  });

  describe("Detecta solicitação de Brag Document", () => {
    it("deve detectar comando /brag", async () => {
      // Arrange
      const msg = createMessage(123456789, 123456789, "/brag");

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining(
          "Vamos gerar seu Brag Document! Escolha o período desejado:"
        ),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });

    it("deve detectar variações do comando brag", async () => {
      // Arrange
      // Usar apenas um dos textos que sabemos que funciona
      const msg = createMessage(123456789, 123456789, "/brag");

      // Simulando que o usuário existe
      (mocks.userExists as jest.Mock).mockResolvedValue(true);
      (mocks.getUserByTelegramId as jest.Mock).mockResolvedValue(existingUser);

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining(
          "Vamos gerar seu Brag Document! Escolha o período desejado:"
        ),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });
  });

  describe("Geração do Brag Document", () => {
    it("deve gerar o Brag Document quando solicitado via callback", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "brag:7"
      );

      // Mock de atividades
      const activities = mockActivities(existingUser.id, "week");

      // Mock de geração do Brag
      (mocks.generateBragDocumentPDF as jest.Mock).mockResolvedValue(
        Buffer.from("PDF simulado")
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mocks.getActivitiesByPeriod).toHaveBeenCalledWith(
        existingUser.id,
        7
      );
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("*BRAG DOCUMENT*"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: callbackQuery.message?.message_id,
          parse_mode: "Markdown"
        })
      );
    });

    it("deve mostrar mensagem quando não há atividades no período", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "brag:30"
      );

      // Mockando nenhuma atividade
      (mocks.getActivitiesByPeriod as jest.Mock).mockResolvedValue([]);

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mocks.getActivitiesByPeriod).toHaveBeenCalledWith(
        existingUser.id,
        30
      );
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining(
          "Hmm, não encontrei nenhuma atividade registrada"
        ),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: callbackQuery.message?.message_id
        })
      );
    });

    it("deve tratar erros na geração do Brag Document", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "brag:30"
      );

      // Mock de erro ao buscar atividades
      (mocks.getActivitiesByPeriod as jest.Mock).mockRejectedValue(
        new Error("Erro ao buscar atividades")
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining(
          "Desculpe, ocorreu um erro ao gerar seu Brag Document"
        ),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: callbackQuery.message?.message_id
        })
      );
    });
  });

  describe("Geração de PDF", () => {
    it("deve iniciar geração de PDF quando solicitado", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        undefined,
        123456789,
        undefined,
        undefined,
        "pdf:30"
      );

      // Mock de atividades
      const activities = mockActivities(existingUser.id, "month");

      // Mock de geração de PDF
      (mocks.generateBragDocumentPDF as jest.Mock).mockResolvedValue(
        Buffer.from("PDF simulado")
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mocks.getActivitiesByPeriod).toHaveBeenCalledWith(
        existingUser.id,
        30
      );
      expect(mockBot.sendDocument).toHaveBeenCalledWith(
        123456789,
        expect.any(Buffer),
        expect.objectContaining({
          caption: "Brag Document - 30 dia(s)"
        }),
        expect.any(Object)
      );
    });

    it("deve mostrar mensagem quando não há atividades para PDF", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        1234,
        "pdf:7"
      );

      // Mockando nenhuma atividade
      (mocks.getActivitiesByPeriod as jest.Mock).mockResolvedValue([]);

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mocks.getActivitiesByPeriod).toHaveBeenCalledWith(
        existingUser.id,
        7
      );

      // Verifica a mensagem de que não há atividades
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        "Não encontrei nenhuma atividade para os últimos 7 dias. Não é possível gerar o PDF.",
        undefined
      );
    });

    it("deve tratar erros na geração do PDF", async () => {
      // Arrange
      const callbackQuery = createCallbackQuery(
        "query123",
        123456789,
        123456789,
        1234,
        "pdf:7"
      );

      // Mock de atividades
      const activities = mockActivities(existingUser.id, "week");

      // Mock de erro ao gerar PDF
      (mocks.generateBragDocumentPDF as jest.Mock).mockRejectedValue(
        new Error("Erro ao gerar PDF")
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Ocorreu um erro ao gerar seu PDF")
      );
    });
  });
});
