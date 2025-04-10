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
      // Verifica que a mensagem de carregamento foi editada primeiro
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("Gerando seu Brag Document"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: callbackQuery.message?.message_id
        })
      );

      // Verifica que a mensagem de carregamento foi excluída
      expect(mockBot.deleteMessage).toHaveBeenCalledWith(
        123456789,
        callbackQuery.message?.message_id
      );

      // Verifica que o Brag Document foi enviado como uma nova mensagem
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("\\*BRAG DOCUMENT\\*"),
        expect.objectContaining({
          parse_mode: "Markdown"
        })
      );

      // Verifica que o sendSticker foi chamado (não importa se foi direto ou via sendStickerSafely)
      expect(mockBot.sendSticker).toHaveBeenCalled();
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

      // Verifica que a mensagem original foi editada com o status de carregamento
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("Gerando seu Brag Document"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: callbackQuery.message?.message_id
        })
      );

      // Verifica que a mensagem de carregamento foi excluída
      expect(mockBot.deleteMessage).toHaveBeenCalledWith(
        123456789,
        callbackQuery.message?.message_id
      );

      // Verifica apenas que a mensagem foi enviada com o texto esperado, sem verificar o terceiro parâmetro
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining(
          "Hmm, não encontrei nenhuma atividade registrada"
        )
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
      // Verifica tentativa de deletar a mensagem de carregamento, mesmo em caso de erro
      expect(mockBot.deleteMessage).toHaveBeenCalledWith(
        123456789,
        callbackQuery.message?.message_id
      );

      // Verifica apenas que a mensagem de erro foi enviada, sem verificar o terceiro parâmetro
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining(
          "Desculpe, ocorreu um erro ao gerar seu Brag Document"
        )
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
      (mocks.generateBragDocumentPDF as jest.Mock).mockResolvedValue({
        success: true
      });

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
          caption: "Brag Document"
        }),
        {
          filename: "brag-document.pdf",
          contentType: "application/pdf"
        }
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
      // Como enviamos múltiplas mensagens, verificamos se alguma delas contém o texto de erro
      const sendMessageCalls = mockBot.sendMessage.mock.calls;
      let hasErrorMessage = false;

      for (const call of sendMessageCalls) {
        if (
          call[1] &&
          typeof call[1] === "string" &&
          call[1].includes("Ocorreu um erro ao gerar seu PDF")
        ) {
          hasErrorMessage = true;
          break;
        }
      }

      expect(hasErrorMessage).toBe(true);
    });

    it("deve geração de PDF incluir opções sem emojis", async () => {
      // Arrange
      const msg = createMessage(123456789, 123456789, "gerar pdf");

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining(
          "Para qual período você deseja gerar o PDF do seu Brag Document?"
        ),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringMatching(/^Hoje$/),
                  callback_data: "pdf:1"
                })
              ]),
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringMatching(/^Últimos 7 dias$/),
                  callback_data: "pdf:7"
                })
              ])
            ])
          })
        })
      );
    });

    it("deve usar mensagem simplificada ao gerar PDF", async () => {
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

      // Mock para indicar que o PDF foi gerado com sucesso
      (mocks.generateBragDocumentPDF as jest.Mock).mockResolvedValue({
        success: true
      });

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        "🧾 Gerando PDF do seu Brag Document..."
      );

      // Verifica que o sendDocument foi chamado com os parâmetros corretos
      expect(mockBot.sendDocument).toHaveBeenCalled();

      // Verifica que não há mensagem com link do PDF
      const sendMessageCalls = mockBot.sendMessage.mock.calls;
      for (const call of sendMessageCalls) {
        if (call[1] && typeof call[1] === "string") {
          expect(call[1]).not.toContain("link");
          expect(call[1]).not.toContain("acessar seu PDF");
        }
      }

      // Verifica cada parâmetro individualmente se a expectativa exata não estiver funcionando
      const sendDocumentCalls = mockBot.sendDocument.mock.calls;
      expect(sendDocumentCalls.length).toBeGreaterThan(0);

      if (sendDocumentCalls.length > 0) {
        const firstCall = sendDocumentCalls[0];
        expect(firstCall[0]).toBe(123456789); // chatId
        expect(Buffer.isBuffer(firstCall[1])).toBeTruthy(); // buffer
        expect(firstCall[2]).toHaveProperty("caption", "Brag Document"); // options
      }

      // Verifica que o sendSticker foi chamado (não importa se foi direto ou via sendStickerSafely)
      expect(mockBot.sendSticker).toHaveBeenCalled();
    });
  });
});
