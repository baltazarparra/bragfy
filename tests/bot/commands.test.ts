// Faz o mock diretamente
jest.mock("../../src/bot/commands", () => {
  // Implementação mockada do mapa pendingActivities
  const pendingActivitiesMap = new Map();
  // Adicionando o mapa pinnedInstructionsStatus mockado
  const pinnedInstructionsStatusMap = new Map();
  // Adicionando o mapa onboardingInProgress mockado
  const onboardingInProgressMap = new Map();

  return {
    ...jest.requireActual("../../src/bot/commands"),
    pendingActivities: pendingActivitiesMap,
    pinnedInstructionsStatus: pinnedInstructionsStatusMap,
    onboardingInProgress: onboardingInProgressMap,
    // Expõe método para limpar o mapa entre testes
    _clearPendingActivities: () => {
      pendingActivitiesMap.clear();
    },
    _clearPinnedInstructionsStatus: () => {
      pinnedInstructionsStatusMap.clear();
    },
    _clearOnboardingInProgress: () => {
      onboardingInProgressMap.clear();
    }
  };
});

import {
  handleStartCommand,
  handleCallbackQuery,
  handleNewChat,
  pendingActivities,
  pinnedInstructionsStatus,
  onboardingInProgress,
  _testHelpers
} from "../../src/bot/commands";
import {
  userExists,
  createUser,
  getUserByTelegramId
} from "../../src/utils/userUtils";
import {
  createActivity,
  formatTimestamp,
  getActivitiesByPeriod,
  formatUrgencyLabel,
  formatImpactLabel
} from "../../src/utils/activityUtils";
import TelegramBot from "node-telegram-bot-api";
import { Activity } from ".prisma/client";
import { generateBragDocumentPDF } from "../../src/utils/pdfUtils";

// Mocks para módulos e funções
jest.mock("../../src/utils/userUtils", () => ({
  userExists: jest.fn(),
  createUser: jest.fn(),
  getUserByTelegramId: jest.fn()
}));

jest.mock("../../src/utils/activityUtils", () => ({
  createActivity: jest.fn(),
  formatTimestamp: jest.fn(),
  getActivitiesByPeriod: jest.fn(),
  formatUrgencyLabel: jest.fn().mockImplementation((urgency) => {
    if (urgency === "high") return "Alta";
    if (urgency === "medium") return "Média";
    return "Baixa";
  }),
  formatImpactLabel: jest.fn().mockImplementation((impact) => {
    if (impact === "high") return "Alto";
    if (impact === "medium") return "Médio";
    return "Baixo";
  })
}));

jest.mock("../../src/utils/pdfUtils", () => ({
  generateBragDocumentPDF: jest.fn()
}));

describe("Handlers de Comando do Bot", () => {
  let mockBot: any;

  beforeEach(() => {
    // Reset todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Limpa o mapa de atividades pendentes entre os testes
    (require("../../src/bot/commands") as any)._clearPendingActivities();
    (require("../../src/bot/commands") as any)._clearPinnedInstructionsStatus();
    (require("../../src/bot/commands") as any)._clearOnboardingInProgress();

    // Cria um mock do bot do Telegram
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 12345 }),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({}),
      sendDocument: jest.fn().mockResolvedValue({}),
      pinChatMessage: jest.fn().mockResolvedValue({})
    };

    // Configura console para não poluir a saída de teste
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("handleNewChat", () => {
    it("deve enviar mensagem de erro quando não há dados do usuário", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: undefined,
        message_id: 1,
        date: 123456789,
        text: "Minha conquista importante"
      } as TelegramBot.Message;

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Não foi possível obter suas informações")
      );
    });

    it("deve pedir para usar /start quando o usuário não existe", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message_id: 1,
        date: 123456789,
        text: "Minha conquista importante"
      } as TelegramBot.Message;

      (userExists as jest.Mock).mockResolvedValue(false);

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(userExists).toHaveBeenCalledWith(123456789);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("envie o comando /start novamente")
      );
    });

    it("deve mostrar opções de confirmação para mensagem de usuário existente", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message_id: 1,
        date: 123456789,
        text: "Minha conquista importante"
      } as TelegramBot.Message;

      (userExists as jest.Mock).mockResolvedValue(true);
      (getUserByTelegramId as jest.Mock).mockResolvedValue({
        id: 1,
        telegramId: 123456789,
        firstName: "João"
      });

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(userExists).toHaveBeenCalledWith(123456789);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Recebi sua atividade"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: "✅ Confirmar" }),
                expect.objectContaining({ text: "✏️ Editar" }),
                expect.objectContaining({ text: "❌ Cancelar" })
              ])
            ])
          })
        })
      );
    });

    it("deve lidar com exceções ao processar nova mensagem", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message_id: 1,
        date: 123456789,
        text: "Minha conquista importante"
      } as TelegramBot.Message;

      (userExists as jest.Mock).mockRejectedValue(
        new Error("Erro ao verificar usuário")
      );

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      // Verificamos se o erro foi logado
      expect(console.error).toHaveBeenCalled();
    });

    it("deve ignorar mensagens enviadas pelo próprio bot", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: {
          id: 987654321,
          first_name: "BragfyBot",
          is_bot: true
        },
        message_id: 1,
        date: 123456789,
        text: "Mensagem do bot"
      } as TelegramBot.Message;

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      // A mensagem do bot deve ser ignorada, então nenhuma verificação de usuário deve ser feita
      expect(userExists).not.toHaveBeenCalled();
      expect(getUserByTelegramId).not.toHaveBeenCalled();
      // O bot não deve enviar nenhuma mensagem de resposta
      expect(mockBot.sendMessage).not.toHaveBeenCalled();
    });
  });
});
