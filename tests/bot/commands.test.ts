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
import axios from "axios";

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

// Mock do módulo axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock da classe TelegramBot
jest.mock("node-telegram-bot-api", () => {
  return jest.fn().mockImplementation(() => {
    return {
      sendMessage: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({}),
      sendSticker: jest.fn().mockResolvedValue({}),
      getMe: jest
        .fn()
        .mockResolvedValue({ id: 123, is_bot: true, first_name: "BragBot" }),
      on: jest.fn(),
      onText: jest.fn()
    };
  });
});

describe("Bot Telegram - Comandos", () => {
  let bot: jest.Mocked<any>;

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
    bot = new TelegramBot("fake-token") as jest.Mocked<any>;

    // Suprime logs de console durante os testes
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("handleStartCommand", () => {
    test("deve responder corretamente ao comando /start", async () => {
      // Configuração
      const msg = {
        chat: { id: 12345 },
        from: { id: 12345, first_name: "User", is_bot: false }
      } as TelegramBot.Message;

      // Execução
      await handleStartCommand(bot, msg);

      // Verificação - Verificamos apenas que a função foi chamada, sem verificar o conteúdo exato
      expect(bot.sendMessage).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        expect.any(Object)
      );
    });

    test("deve responder com erro se não conseguir obter informações do usuário", async () => {
      // Configuração
      const msg = {
        chat: { id: 12345 },
        from: undefined
      } as TelegramBot.Message;

      // Execução
      await handleStartCommand(bot, msg);

      // Verificação
      expect(bot.sendMessage).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringContaining("Não foi possível obter suas informações")
      );
    });
  });

  describe("handleCallbackQuery", () => {
    test("deve processar callback para botões inline", async () => {
      // Configuração
      const query = {
        id: "query123",
        data: "generate_pdf",
        from: { id: 12345, first_name: "User", is_bot: false },
        message: {
          chat: { id: 12345 },
          message_id: 678
        },
        chat_instance: "chat123"
      } as TelegramBot.CallbackQuery;

      // Execução
      await handleCallbackQuery(bot, query);

      // Verificação - Verificamos apenas que as funções foram chamadas
      expect(bot.answerCallbackQuery).toHaveBeenCalled();
    });

    test("deve lidar corretamente com dados de callback incompletos", async () => {
      // Configuração
      const query = {
        id: "query123",
        data: "unknown_action",
        from: undefined,
        message: undefined,
        chat_instance: "chat123"
      } as unknown as TelegramBot.CallbackQuery;

      // Execução
      await handleCallbackQuery(bot, query);

      // Verificação
      expect(bot.sendMessage).not.toHaveBeenCalled();
    });
  });
});
