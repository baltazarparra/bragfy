import TelegramBot from "node-telegram-bot-api";
import {
  handleCallbackQuery,
  lastGeneratedDocumentActivities
} from "../../../src/bot/commands";
import { Activity } from "../../../src/db/client";
import * as llmUtils from "../../../src/utils/llmUtils";
import * as userUtils from "../../../src/utils/userUtils";
import { createMockBot, setupMocksBeforeEach } from "../setup";

// Mock do módulo llmUtils
jest.mock("../../../src/utils/llmUtils", () => ({
  formatActivitiesForPrompt: jest.fn().mockImplementation((activities) => {
    return activities
      .map((activity: any) => {
        const date = new Date(activity.createdAt);
        const formattedDate = date.toISOString().split("T")[0];
        return `• [${formattedDate}] ${activity.content}`;
      })
      .join("\n");
  }),
  analyzeProfileWithLLM: jest.fn().mockImplementation(async () => {
    return {
      success: true,
      result: "Análise de perfil profissional simulada para testes."
    };
  })
}));

describe("Análise de Perfil Profissional", () => {
  let mockBot: any; // Usando any para evitar problemas de tipo
  const telegramUserId = 123456789;
  const chatId = telegramUserId;

  // Configuração antes de cada teste
  beforeEach(() => {
    // Configuração padrão de mocks
    setupMocksBeforeEach();

    // Cria um bot mockado
    mockBot = createMockBot();

    // Limpa o Map de atividades geradas
    lastGeneratedDocumentActivities.clear();

    // Mock de atividades para testes
    const mockActivities = [
      {
        id: 1,
        userId: 1,
        content: "Reunião com stakeholders para definição de roadmap",
        createdAt: new Date("2024-04-01T10:00:00Z"),
        urgency: "high",
        impact: "high"
      },
      {
        id: 2,
        userId: 1,
        content: "Revisão técnica dos pull requests da API",
        createdAt: new Date("2024-04-03T14:30:00Z"),
        urgency: "medium",
        impact: "medium"
      }
    ] as Activity[];

    // Armazena as atividades no Map para uso nos testes
    lastGeneratedDocumentActivities.set(telegramUserId, mockActivities);
  });

  it("deve responder corretamente quando o usuário recusa a análise", async () => {
    // Cria um callback query para recusa de análise
    const callbackQuery: TelegramBot.CallbackQuery = {
      id: "123",
      from: {
        id: telegramUserId,
        first_name: "Usuário",
        is_bot: false
      },
      chat_instance: "456",
      message: {
        message_id: 789,
        date: 0,
        chat: {
          id: chatId,
          type: "private"
        }
      },
      data: "analyze:no"
    };

    // Executa a função a ser testada
    await handleCallbackQuery(mockBot, callbackQuery);

    // Verifica se a resposta foi enviada corretamente
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      "Tudo bem! Se quiser analisar depois, é só pedir."
    );

    // Verifica se o callback foi respondido
    expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith("123", {
      text: "Análise cancelada"
    });
  });

  it("deve solicitar análise de perfil e enviar o resultado", async () => {
    // Configura mock para retornar um usuário válido
    jest.spyOn(userUtils, "getUserByTelegramId").mockResolvedValue({
      id: 42,
      telegramId: telegramUserId,
      firstName: "Usuário",
      lastName: "Teste",
      username: "usuario_teste",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Cria um callback query para solicitação de análise
    const callbackQuery: TelegramBot.CallbackQuery = {
      id: "123",
      from: {
        id: telegramUserId,
        first_name: "Usuário",
        is_bot: false
      },
      chat_instance: "456",
      message: {
        message_id: 789,
        date: 0,
        chat: {
          id: chatId,
          type: "private"
        }
      },
      data: "analyze:7" // Período de 7 dias
    };

    // Mock da mensagem de carregamento
    mockBot.sendMessage.mockResolvedValueOnce({
      message_id: 999,
      date: 0,
      chat: {
        id: chatId,
        type: "private"
      }
    });

    // Executa a função a ser testada
    await handleCallbackQuery(mockBot, callbackQuery);

    // Verifica se a mensagem de carregamento foi enviada
    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      1,
      chatId,
      "⏳ Analisando seu perfil profissional com base nas atividades registradas..."
    );

    // Verifica se a análise de perfil foi enviada como segunda mensagem
    const allCalls = mockBot.sendMessage.mock.calls;
    expect(allCalls.length).toBeGreaterThan(1);

    // Procura pela chamada de envio da análise entre todas as chamadas
    const analysisCall = allCalls.find(
      (call) =>
        typeof call[1] === "string" &&
        call[1].includes("Análise de perfil profissional")
    );

    expect(analysisCall).toBeDefined();
    expect(analysisCall[0]).toBe(chatId);
    expect(analysisCall[2]).toEqual(
      expect.objectContaining({ parse_mode: "Markdown" })
    );

    // Verifica se a formatação das atividades foi chamada
    expect(llmUtils.formatActivitiesForPrompt).toHaveBeenCalled();

    // Verifica se a análise foi solicitada
    expect(llmUtils.analyzeProfileWithLLM).toHaveBeenCalled();

    // Verifica se o sticker foi enviado
    expect(mockBot.sendSticker).toHaveBeenCalled();

    // Verifica se a mensagem de carregamento foi removida
    expect(mockBot.deleteMessage).toHaveBeenCalledWith(chatId, 999);
  });

  it("deve lidar com erro quando não houver atividades armazenadas", async () => {
    // Limpa o Map de atividades
    lastGeneratedDocumentActivities.clear();

    // Cria um callback query para solicitação de análise
    const callbackQuery: TelegramBot.CallbackQuery = {
      id: "123",
      from: {
        id: telegramUserId,
        first_name: "Usuário",
        is_bot: false
      },
      chat_instance: "456",
      message: {
        message_id: 789,
        date: 0,
        chat: {
          id: chatId,
          type: "private"
        }
      },
      data: "analyze:7"
    };

    // Executa a função a ser testada
    await handleCallbackQuery(mockBot, callbackQuery);

    // Verifica se a mensagem de erro foi enviada
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      chatId,
      "Não foi possível recuperar suas atividades para análise. Por favor, gere novamente seu documento."
    );

    // Verifica se o callback foi respondido com erro
    expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith("123", {
      text: "Erro: atividades não encontradas"
    });
  });

  it("deve lidar com erro na análise de perfil", async () => {
    // Configura mock para retornar um usuário válido
    jest.spyOn(userUtils, "getUserByTelegramId").mockResolvedValue({
      id: 42,
      telegramId: telegramUserId,
      firstName: "Usuário",
      lastName: "Teste",
      username: "usuario_teste",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Mock para simular erro na análise
    (llmUtils.analyzeProfileWithLLM as jest.Mock).mockImplementationOnce(
      async () => {
        return {
          success: false,
          result:
            "Desculpe, não foi possível completar a análise do seu perfil. Por favor, tente novamente mais tarde ou entre em contato com o suporte."
        };
      }
    );

    // Cria um callback query para solicitação de análise
    const callbackQuery: TelegramBot.CallbackQuery = {
      id: "123",
      from: {
        id: telegramUserId,
        first_name: "Usuário",
        is_bot: false
      },
      chat_instance: "456",
      message: {
        message_id: 789,
        date: 0,
        chat: {
          id: chatId,
          type: "private"
        }
      },
      data: "analyze:7"
    };

    // Mock da mensagem de carregamento
    mockBot.sendMessage.mockResolvedValueOnce({
      message_id: 999,
      date: 0,
      chat: {
        id: chatId,
        type: "private"
      }
    });

    // Executa a função a ser testada
    await handleCallbackQuery(mockBot, callbackQuery);

    // Verifica se a mensagem de erro foi enviada no lugar certo
    // Primeiro é enviada a mensagem de carregamento, depois vem a mensagem de erro
    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      1,
      chatId,
      "⏳ Analisando seu perfil profissional com base nas atividades registradas..."
    );

    // Em algum momento deve ser enviada a mensagem de erro
    const errorCalls = mockBot.sendMessage.mock.calls.filter(
      (call) =>
        typeof call[1] === "string" &&
        call[1].includes(
          "Desculpe, não foi possível completar a análise do seu perfil"
        )
    );

    expect(errorCalls.length).toBeGreaterThan(0);
    expect(errorCalls[0][0]).toBe(chatId);

    // Verifica se a mensagem de carregamento foi removida
    expect(mockBot.deleteMessage).toHaveBeenCalledWith(chatId, 999);
  });
});
