import TelegramBot from "node-telegram-bot-api";
import * as userUtils from "../../src/utils/userUtils";
import * as activityUtils from "../../src/utils/activityUtils";
import * as pdfUtils from "../../src/utils/pdfUtils";
import type { User } from "@prisma/client";

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
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});

// Mockar as funções de utils
export const mocks = {
  userExists: jest.spyOn(userUtils, "userExists"),
  getUserByTelegramId: jest.spyOn(userUtils, "getUserByTelegramId"),
  createUser: jest.spyOn(userUtils, "createUser"),
  createActivity: jest.spyOn(activityUtils, "createActivity"),
  getActivitiesByPeriod: jest.spyOn(activityUtils, "getActivitiesByPeriod"),
  formatTimestamp: jest.spyOn(activityUtils, "formatTimestamp"),
  formatUrgencyLabel: jest.spyOn(activityUtils, "formatUrgencyLabel"),
  formatImpactLabel: jest.spyOn(activityUtils, "formatImpactLabel"),
  generateBragDocument: jest.fn(),
  generatePDF: jest.fn(),
  generateBragDocumentPDF: jest.spyOn(pdfUtils, "generateBragDocumentPDF")
};

// Mock do cliente Prisma
export const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  activity: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  $connect: jest.fn(),
  $disconnect: jest.fn()
};

// Mock do bot do Telegram
export function createMockBot() {
  return {
    sendMessage: jest.fn().mockResolvedValue({ message_id: 100 }),
    sendDocument: jest.fn().mockResolvedValue({}),
    deleteMessage: jest.fn().mockResolvedValue(true),
    pinChatMessage: jest.fn().mockResolvedValue(true),
    unpinChatMessage: jest.fn().mockResolvedValue(true),
    answerCallbackQuery: jest.fn().mockResolvedValue(true),
    editMessageText: jest.fn().mockResolvedValue({}),
    editMessageReplyMarkup: jest.fn().mockResolvedValue({})
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

  (mocks.userExists as jest.Mock).mockResolvedValue(true);
  (mocks.getUserByTelegramId as jest.Mock).mockResolvedValue(user);

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

  (mocks.userExists as jest.Mock).mockResolvedValue(false);
  (mocks.getUserByTelegramId as jest.Mock).mockResolvedValue(null);
  (mocks.createUser as jest.Mock).mockResolvedValue(newUser);

  return newUser;
}

// Função para mockar atividades para um usuário
export function mockActivities(userId: number, period: string) {
  const activities = [
    {
      id: "1",
      userId: userId,
      description: "Implementei nova funcionalidade",
      urgency: "high",
      impact: "medium",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "2",
      userId: userId,
      description: "Corrigi bug crítico",
      urgency: "high",
      impact: "high",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  (mocks.getActivitiesByPeriod as jest.Mock).mockResolvedValue(activities);
  (mocks.generateBragDocument as jest.Mock).mockReturnValue(
    "# Brag Document\n\n## Alta Prioridade\n- Implementei nova funcionalidade\n- Corrigi bug crítico"
  );
  (mocks.generatePDF as jest.Mock).mockResolvedValue(
    "/caminho/para/brag_document.pdf"
  );

  return activities;
}

// Função para configurar os mocks antes de cada teste
export function setupMocksBeforeEach() {
  // Limpar todos os mocks antes de cada teste
  jest.clearAllMocks();

  // Configurar comportamento padrão dos mocks
  (mocks.userExists as jest.Mock).mockResolvedValue(false);
  (mocks.getUserByTelegramId as jest.Mock).mockResolvedValue(null);
  (mocks.createUser as jest.Mock).mockImplementation((telegramUser) => {
    return Promise.resolve({
      id: 43,
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name || null,
      username: telegramUser.username || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  (mocks.createActivity as jest.Mock).mockImplementation((activityData) => {
    return Promise.resolve({
      id: "activity-" + Math.random().toString(36).substring(7),
      ...activityData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  (mocks.getActivitiesByPeriod as jest.Mock).mockResolvedValue([]);
  (mocks.formatTimestamp as jest.Mock).mockImplementation((date) => {
    return new Date(date).toLocaleString("pt-BR");
  });
  (mocks.formatUrgencyLabel as jest.Mock).mockImplementation((urgency) => {
    const labels = {
      high: "🔴 Alta",
      medium: "🟠 Média",
      low: "🟢 Baixa"
    };
    return labels[urgency as keyof typeof labels] || urgency;
  });
  (mocks.formatImpactLabel as jest.Mock).mockImplementation((impact) => {
    const labels = {
      high: "🔴 Alto",
      medium: "🟠 Médio",
      low: "🟢 Baixo"
    };
    return labels[impact as keyof typeof labels] || impact;
  });

  (mocks.generateBragDocument as jest.Mock).mockImplementation(
    (activities: any[], user: any) => {
      return `# Brag Document de ${user.firstName}\n\n## Atividades\n${activities
        .map((a: any) => `- ${a.description}`)
        .join("\n")}`;
    }
  );

  (mocks.generatePDF as jest.Mock).mockImplementation(async () => {
    return "/caminho/para/brag_document.pdf";
  });

  (mocks.generateBragDocumentPDF as jest.Mock).mockImplementation(async () => {
    return Buffer.from("PDF simulado");
  });
}
