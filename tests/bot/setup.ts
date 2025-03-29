import TelegramBot from "node-telegram-bot-api";
import * as userUtils from "../../src/utils/userUtils";
import * as activityUtils from "../../src/utils/activityUtils";
import * as pdfUtils from "../../src/utils/pdfUtils";
import * as stickerUtils from "../../src/utils/stickerUtils";
import { BragDocumentPdfResult } from "../../src/utils/stickerUtils";

// Nota: não importando prisma diretamente, pois está sendo mockado via jest.config.ts
// Importando apenas para os tipos
import { prisma } from "../../src/db/client";

// Definir uma interface Activity com id como number ou string
interface Activity {
  id: number | string;
  userId: number;
  content: string;
  urgency?: string;
  impact?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para o tipo de dados de atividade pendente
export interface PendingActivityData {
  userId?: number;
  content?: string;
  activityId?: number; // Preenchido após a criação da atividade
  urgency?: string;
  impact?: string;
  edit_description?: boolean;
  [key: string]: any; // Permite propriedades adicionais como 'status'
}

// Mocks para suprimir logs durante os testes
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

// Mockar as funções de utils
export const mocks = {
  userExists: jest
    .spyOn(userUtils, "userExists")
    .mockImplementation(() => Promise.resolve(false)),
  getUserByTelegramId: jest
    .spyOn(userUtils, "getUserByTelegramId")
    .mockImplementation(() => Promise.resolve(null)),
  createUser: jest
    .spyOn(userUtils, "createUser")
    .mockImplementation((telegramUser) => {
      return Promise.resolve({
        id: 43,
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }),
  createActivity: jest
    .spyOn(activityUtils, "createActivity")
    .mockImplementation((userId, content, urgency, impact) => {
      return Promise.resolve({
        id: Math.floor(Math.random() * 10000), // ID numérico para compatibilidade com o tipo Activity
        userId,
        content,
        urgency: urgency || "medium",
        impact: impact || "medium",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }),
  getActivitiesByPeriod: jest
    .spyOn(activityUtils, "getActivitiesByPeriod")
    .mockResolvedValue([]),
  formatTimestamp: jest
    .spyOn(activityUtils, "formatTimestamp")
    .mockImplementation((date) => {
      return new Date(date).toLocaleString("pt-BR");
    }),
  formatUrgencyLabel: jest
    .spyOn(activityUtils, "formatUrgencyLabel")
    .mockImplementation((urgency) => {
      const labels: Record<string, string> = {
        high: "Alta",
        medium: "Média",
        low: "Baixa"
      };
      return labels[urgency] || urgency;
    }),
  formatImpactLabel: jest
    .spyOn(activityUtils, "formatImpactLabel")
    .mockImplementation((impact) => {
      const labels: Record<string, string> = {
        high: "Alto",
        medium: "Médio",
        low: "Baixo"
      };
      return labels[impact] || impact;
    }),
  generateBragDocument: jest.fn(),
  generatePDF: jest.fn(),
  generateBragDocumentPDF: jest
    .spyOn(pdfUtils, "generateBragDocumentPDF")
    .mockResolvedValue({
      success: true
    } as BragDocumentPdfResult),
  getRandomStickerFor: jest
    .spyOn(stickerUtils, "getRandomStickerFor")
    .mockImplementation(() => {
      return "CAACAgIAAxkBAAEFJQVkQ_l4nAABGFAyRfjQlNMrK-W_mU8AAmcAAzj5wUrIAtUZoWZgUjQE";
    }),
  sendStickerSafely: jest
    .spyOn(stickerUtils, "sendStickerSafely")
    .mockImplementation(async () => {
      return true;
    }),
  // Mocks do Prisma - usamos apenas os spyOn para os testes, os mocks reais estão em __mocks__/@prisma/client.js
  prismaUserFindUnique: jest.fn() as jest.SpyInstance<Promise<any>>,
  prismaUserCreate: jest.fn() as jest.SpyInstance<Promise<any>>,
  prismaActivityCreate: jest.fn() as jest.SpyInstance<Promise<any>>,
  prismaActivityFindMany: jest.fn() as jest.SpyInstance<Promise<any[]>>
};

// Mock do bot do Telegram
export function createMockBot() {
  return {
    sendMessage: jest.fn().mockResolvedValue({ message_id: 100 }),
    sendSticker: jest.fn().mockResolvedValue({}),
    sendDocument: jest.fn().mockResolvedValue({}),
    deleteMessage: jest.fn().mockResolvedValue(true),
    editMessageText: jest.fn().mockResolvedValue({}),
    editMessageReplyMarkup: jest.fn().mockResolvedValue({}),
    pinChatMessage: jest.fn().mockResolvedValue(true),
    unpinChatMessage: jest.fn().mockResolvedValue(true),
    answerCallbackQuery: jest.fn().mockResolvedValue(true),
    getChatAdministrators: jest
      .fn()
      .mockResolvedValue([{ user: { id: 123456789 } }])
  };
}

// Função para criar um objeto de mensagem do Telegram
export function createMessage(
  userId: number,
  chatId: number,
  text: string,
  messageId = 1234
) {
  return {
    message_id: messageId,
    date: Math.floor(Date.now() / 1000),
    chat: {
      id: chatId,
      type: "private" as TelegramBot.ChatType
    },
    from: {
      id: userId,
      is_bot: false,
      first_name: "João",
      username: "joaosilva"
    } as
      | { id: number; is_bot: boolean; first_name: string; username: string }
      | undefined,
    text
  };
}

// Função para criar um objeto de callback query do Telegram
export function createCallbackQuery(
  queryId: string = `query-${Math.random().toString(36).substring(7)}`,
  userId: number,
  chatId: number = userId,
  messageId: number = 1234,
  data: string
) {
  return {
    id: queryId,
    from: {
      id: userId,
      is_bot: false,
      first_name: "João",
      username: "joaosilva"
    },
    message: {
      message_id: messageId,
      chat: {
        id: chatId,
        type: "private" as TelegramBot.ChatType
      },
      date: Math.floor(Date.now() / 1000),
      text: "Mensagem original"
    },
    data,
    chat_instance: `chat-instance-${Date.now()}`
  };
}

// Função para mockar um usuário existente no sistema
export function mockExistingUser(userId: number = 123456789) {
  const user = {
    id: 42,
    telegramId: userId,
    firstName: "João",
    lastName: "Silva",
    username: "joaosilva",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  mocks.userExists.mockResolvedValue(true);
  mocks.getUserByTelegramId.mockResolvedValue(user);

  return user;
}

// Função para mockar um novo usuário (que não existe no sistema)
export function mockNewUser(userId: number = 123456789) {
  const newUser = {
    id: 43,
    telegramId: userId,
    firstName: "João",
    lastName: "Silva",
    username: "joaosilva",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  mocks.userExists.mockResolvedValue(false);
  mocks.getUserByTelegramId.mockResolvedValue(null);
  mocks.createUser.mockResolvedValue(newUser);

  return newUser;
}

// Função para mockar atividades para um usuário
export function mockActivities(userId: number, period: string): Activity[] {
  const activities: Activity[] = [
    {
      id: 1,
      userId: userId,
      content: "Implementei nova funcionalidade",
      urgency: "high",
      impact: "medium",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 2,
      userId: userId,
      content: "Corrigi bug crítico",
      urgency: "high",
      impact: "high",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Usar any para contornar problemas de tipo
  mocks.getActivitiesByPeriod.mockImplementation(() =>
    Promise.resolve(activities as any)
  );

  return activities;
}

// Função para configurar os mocks antes de cada teste
export function setupMocksBeforeEach() {
  // Limpa todos os mocks
  jest.clearAllMocks();

  // Configura mocks para simular usuário novo
  mocks.userExists.mockImplementation(() => Promise.resolve(false));
  mocks.getUserByTelegramId.mockImplementation(() => Promise.resolve(null));

  // Configura o mock do Prisma para userExists
  mocks.prismaUserFindUnique.mockImplementation(({ where }) => {
    // Se for o ID 123456789, returna um usuário existente
    if (where.telegramId === 123456789) {
      return Promise.resolve({
        id: 43,
        telegramId: 123456789,
        firstName: "João",
        lastName: null,
        username: "joaosilva",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return Promise.resolve(null);
  });

  // Configura o mock do Prisma para createUser
  mocks.prismaUserCreate.mockImplementation(({ data }) => {
    return Promise.resolve({
      id: 43,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  // Configura o mock do Prisma para createActivity
  mocks.prismaActivityCreate.mockImplementation(({ data }) => {
    return Promise.resolve({
      id: Math.floor(Math.random() * 10000),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  // Configura o mock do Prisma para getActivitiesByPeriod
  mocks.prismaActivityFindMany.mockImplementation(({ where }) => {
    if (where.userId === 43) {
      return Promise.resolve([
        {
          id: 101,
          content: "Atividade 1",
          userId: 43,
          urgency: "high",
          impact: "medium",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 102,
          content: "Atividade 2",
          userId: 43,
          urgency: "medium",
          impact: "high",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    }
    return Promise.resolve([]);
  });

  // Mocks relacionados a stickers
  mocks.getRandomStickerFor.mockReturnValue("STICKER_FILE_ID_1");
  mocks.sendStickerSafely.mockImplementation(
    async (bot, chatId, interaction) => {
      // Chamar o bot.sendSticker diretamente para garantir que o mock do bot é usado
      await bot.sendSticker(chatId, "STICKER_FILE_ID_1");
      return true;
    }
  );

  // Mock para formatTimestamp
  mocks.formatTimestamp.mockImplementation(
    (date) =>
      `${new Date(date).toLocaleDateString()} às ${new Date(date).toLocaleTimeString()}`
  );
}
