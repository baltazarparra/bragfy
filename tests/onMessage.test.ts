import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleMessage } from "../src/handlers/onMessage";
import { extractTime } from "../src/utils/extractTime";
import TelegramBot from "node-telegram-bot-api";

// Mock do módulo de extração de tempo
vi.mock("../src/utils/extractTime", () => ({
  extractTime: vi.fn()
}));

// Mock do formatTimestamp
vi.mock("../src/utils/formatTimestamp", () => ({
  formatTimestamp: vi.fn((date) => {
    return date instanceof Date
      ? `${String(date.getDate()).padStart(2, "0")}/${String(
          date.getMonth() + 1
        ).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)} ${String(
          date.getHours()
        ).padStart(2, "0")}:${String(date.getMinutes()).padStart(
          2,
          "0"
        )}:${String(date.getSeconds()).padStart(2, "0")}`
      : "01/01/01 00:00:00";
  })
}));

// Mock do cliente Prisma
vi.mock("../src/db", () => ({
  default: {
    activity: {
      create: vi.fn()
    }
  }
}));

// Import do mock do Prisma
import prisma from "../src/db";
import { formatTimestamp } from "../src/utils/formatTimestamp";

describe("handleMessage", () => {
  // Data fixa para testes
  const fixedDate = new Date("2023-05-15T12:00:00");
  const fixedExtractedTime = new Date("2023-05-15T10:30:00");

  // Mock do bot do Telegram
  const mockBot = {
    sendMessage: vi.fn().mockResolvedValue(undefined)
  } as unknown as TelegramBot;

  // Mock de mensagem base
  const baseMockMsg: TelegramBot.Message = {
    message_id: 123,
    chat: {
      id: 456,
      type: "private",
      first_name: "Usuário",
      last_name: "Teste"
    },
    from: {
      id: 789,
      is_bot: false,
      first_name: "Usuário",
      last_name: "Teste"
    },
    date: Math.floor(fixedDate.getTime() / 1000),
    text: "Reunião com cliente"
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);

    // Limpa todos os mocks antes de cada teste
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve salvar a atividade com timestamp extraído quando houver horário na mensagem", async () => {
    // Configura o mock de extractTime para retornar um horário
    (extractTime as any).mockReturnValue({
      extractedTime: fixedExtractedTime,
      cleanMessage: "Reunião com cliente"
    });

    // Cria uma mensagem com horário
    const mockMsg = {
      ...baseMockMsg,
      text: "Reunião com cliente às 10:30"
    };

    // Configura o mock do Prisma para retornar um objeto de atividade
    (prisma.activity.create as any).mockResolvedValue({
      id: "abc-123",
      telegramUserId: 789,
      message: "Reunião com cliente",
      timestamp: fixedExtractedTime,
      createdAt: fixedDate,
      updatedAt: fixedDate
    });

    // Executa a função alvo
    await handleMessage(mockBot, mockMsg);

    // Verifica se extractTime foi chamado com os parâmetros corretos
    expect(extractTime).toHaveBeenCalledWith(
      "Reunião com cliente às 10:30",
      expect.any(Date)
    );

    // Verifica se o Prisma foi chamado para criar a atividade com os dados corretos
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        telegramUserId: 789,
        message: "Reunião com cliente",
        timestamp: fixedExtractedTime
      }
    });

    // Verifica se o formatTimestamp foi chamado com o horário extraído
    expect(formatTimestamp).toHaveBeenCalledWith(fixedExtractedTime);

    // Verifica se o bot enviou a mensagem de confirmação com o formato padronizado
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      456,
      expect.stringMatching(
        /^✅ Atividade registrada para \d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/
      )
    );
  });

  it("deve usar a data da mensagem quando não houver horário extraído", async () => {
    // Configura o mock de extractTime para não retornar horário
    (extractTime as any).mockReturnValue({
      extractedTime: null,
      cleanMessage: "Reunião com cliente"
    });

    // Configura o mock do Prisma
    (prisma.activity.create as any).mockResolvedValue({
      id: "abc-123",
      telegramUserId: 789,
      message: "Reunião com cliente",
      timestamp: fixedDate,
      createdAt: fixedDate,
      updatedAt: fixedDate
    });

    // Executa a função alvo
    await handleMessage(mockBot, baseMockMsg);

    // Verifica se extractTime foi chamado
    expect(extractTime).toHaveBeenCalledWith(
      "Reunião com cliente",
      expect.any(Date)
    );

    // Verifica se o Prisma foi chamado com o timestamp da mensagem
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        telegramUserId: 789,
        message: "Reunião com cliente",
        timestamp: fixedDate
      }
    });

    // Verifica se o formatTimestamp foi chamado com a data da mensagem
    expect(formatTimestamp).toHaveBeenCalledWith(fixedDate);

    // Verifica se o bot enviou a mensagem de confirmação com o formato padronizado
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      456,
      expect.stringMatching(
        /^✅ Atividade registrada para \d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/
      )
    );
  });

  it("deve ignorar mensagens que começam com /", async () => {
    // Mensagem com comando
    const commandMsg = {
      ...baseMockMsg,
      text: "/start"
    };

    // Executa a função alvo
    await handleMessage(mockBot, commandMsg);

    // Verifica que nada foi chamado
    expect(extractTime).not.toHaveBeenCalled();
    expect(prisma.activity.create).not.toHaveBeenCalled();
    expect(mockBot.sendMessage).not.toHaveBeenCalled();
  });

  it("deve tratar erros do Prisma e enviar mensagem de erro", async () => {
    // Configura o mock de extractTime
    (extractTime as any).mockReturnValue({
      extractedTime: null,
      cleanMessage: "Reunião com cliente"
    });

    // Simula um erro no Prisma
    (prisma.activity.create as any).mockRejectedValue(
      new Error("Erro de banco de dados")
    );

    // Executa a função alvo
    await handleMessage(mockBot, baseMockMsg);

    // Verifica se a mensagem de erro foi enviada
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      456,
      "❌ Não foi possível registrar sua atividade. Tente novamente."
    );
  });

  it("deve ignorar mensagens sem userId", async () => {
    // Mensagem sem userId
    const noUserMsg = {
      ...baseMockMsg,
      from: undefined
    };

    // Executa a função alvo
    await handleMessage(mockBot, noUserMsg);

    // Verifica que nada foi salvo
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });
});
