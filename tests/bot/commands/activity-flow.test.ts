import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { handleNewChat } from "../../../src/bot/commands";
import {
  createMockBot,
  createMessage,
  mockExistingUser,
  setupMocksBeforeEach,
  mocks
} from "../setup";
import { mockActivity } from "../../mocks/activityMocks";

describe("Fluxo de Atividades", () => {
  let mockBot: any;
  let existingUser: any;

  beforeEach(() => {
    setupMocksBeforeEach();
    mockBot = createMockBot();
    existingUser = mockExistingUser(123456789);
  });

  describe("Nova atividade", () => {
    it("não deve enviar mensagem de carregamento específica para primeira atividade do dia", async () => {
      // Arrange
      const msg = createMessage(
        existingUser.telegramId,
        existingUser.telegramId,
        "Nova atividade do dia"
      );

      // Mock retornando lista vazia (nenhuma atividade ainda hoje)
      (mocks.getActivitiesByPeriod as any).mockResolvedValue([]);

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      // Verifica que NÃO foi enviada a mensagem de carregamento específica da primeira atividade
      const loadingCalls = mockBot.sendMessage.mock.calls.filter(
        (call: [number, string, any]) =>
          call[1] === "⏳ Registrando sua primeira atividade do dia..."
      );
      expect(loadingCalls.length).toBe(0);

      // Ainda deve confirmar a atividade normalmente
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        existingUser.telegramId,
        expect.stringContaining("Recebi sua atividade"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });

    it("deve enviar apenas a mensagem de confirmação para atividades subsequentes do dia", async () => {
      // Arrange
      const msg = createMessage(
        existingUser.telegramId,
        existingUser.telegramId,
        "Segunda atividade do dia"
      );

      // Mock retornando uma atividade existente (já tem atividade hoje)
      const existingActivity = mockActivity(existingUser.id);
      (mocks.getActivitiesByPeriod as any).mockResolvedValue([
        existingActivity
      ]);

      // Act
      await handleNewChat(mockBot, msg);

      // Assert - Verifica que não houve chamada com mensagem de carregamento da primeira atividade
      const loadingCalls = mockBot.sendMessage.mock.calls.filter(
        (call: [number, string, any]) =>
          call[1] === "⏳ Registrando sua primeira atividade do dia..."
      );
      expect(loadingCalls.length).toBe(0);

      // Ainda deve confirmar a atividade normalmente
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        existingUser.telegramId,
        expect.stringContaining("Recebi sua atividade"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });
  });
});
