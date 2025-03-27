import {
  handleStartCommand,
  handleCallbackQuery,
  handleNewChat
} from "../../src/bot/commands";
import {
  userExists,
  createUser,
  getUserByTelegramId
} from "../../src/utils/userUtils";
import {
  createActivity,
  formatTimestamp,
  getActivitiesByPeriod
} from "../../src/utils/activityUtils";
import TelegramBot from "node-telegram-bot-api";
import { Activity } from ".prisma/client";

// Mocks para módulos e funções
jest.mock("../../src/utils/userUtils", () => ({
  userExists: jest.fn(),
  createUser: jest.fn(),
  getUserByTelegramId: jest.fn()
}));

jest.mock("../../src/utils/activityUtils", () => ({
  createActivity: jest.fn(),
  formatTimestamp: jest.fn(),
  getActivitiesByPeriod: jest.fn()
}));

describe("Handlers de Comando do Bot", () => {
  let mockBot: any;

  beforeEach(() => {
    // Reset todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Cria um mock do bot do Telegram
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({})
    };

    // Configura console para não poluir a saída de teste
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("handleStartCommand", () => {
    it("deve enviar mensagem de erro quando não há dados do usuário", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: undefined,
        message_id: 1,
        date: 123456789
      } as TelegramBot.Message;

      // Act
      await handleStartCommand(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Não foi possível obter suas informações")
      );
    });

    it("deve enviar mensagem de boas-vindas para usuário existente", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message_id: 1,
        date: 123456789
      } as TelegramBot.Message;

      (userExists as jest.Mock).mockResolvedValue(true);

      // Act
      await handleStartCommand(mockBot, msg);

      // Assert
      expect(userExists).toHaveBeenCalledWith(123456789);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Olá novamente, João")
      );
    });

    it("deve criar usuário e enviar mensagem para novo usuário", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message_id: 1,
        date: 123456789
      } as TelegramBot.Message;

      (userExists as jest.Mock).mockResolvedValue(false);
      (createUser as jest.Mock).mockResolvedValue({
        id: 1,
        telegramId: 123456789,
        firstName: "João"
      });

      // Act
      await handleStartCommand(mockBot, msg);

      // Assert
      expect(userExists).toHaveBeenCalledWith(123456789);
      expect(createUser).toHaveBeenCalledWith(msg.from);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Bem-vindo ao Bragfy"),
        expect.objectContaining({ parse_mode: "Markdown" })
      );
    });

    it("deve incluir a fonte na mensagem de boas-vindas", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message_id: 1,
        date: 123456789
      } as TelegramBot.Message;

      (userExists as jest.Mock).mockResolvedValue(false);
      (createUser as jest.Mock).mockResolvedValue({
        id: 1,
        telegramId: 123456789,
        firstName: "João"
      });

      // Act
      await handleStartCommand(mockBot, msg, "instagram");

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Instagram"),
        expect.any(Object)
      );
    });

    it("deve lidar com erro durante o processamento", async () => {
      // Arrange
      const msg = {
        chat: { id: 123456789 },
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message_id: 1,
        date: 123456789
      } as TelegramBot.Message;

      (userExists as jest.Mock).mockRejectedValue(
        new Error("Erro no banco de dados")
      );

      // Act
      await handleStartCommand(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Ocorreu um erro ao processar seu comando")
      );
    });
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

    it("deve detectar comando /brag e mostrar opções de período", async () => {
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
        text: "/brag"
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
        expect.stringContaining("Vamos gerar seu Brag Document"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: "🟢 Atividades de hoje",
                  callback_data: "brag:1"
                })
              ]),
              expect.arrayContaining([
                expect.objectContaining({
                  text: "🔵 Últimos 7 dias",
                  callback_data: "brag:7"
                })
              ]),
              expect.arrayContaining([
                expect.objectContaining({
                  text: "🟣 Últimos 30 dias",
                  callback_data: "brag:30"
                })
              ])
            ])
          })
        })
      );
    });

    it("deve detectar comando /bragfy e mostrar opções de período", async () => {
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
        text: "/bragfy"
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
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Vamos gerar seu Brag Document"),
        expect.any(Object)
      );
    });

    it("deve detectar palavras-chave como 'gerar brag' e mostrar opções de período", async () => {
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
        text: "gerar brag document para meu chefe"
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
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Vamos gerar seu Brag Document"),
        expect.any(Object)
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
  });

  describe("handleCallbackQuery", () => {
    it("deve retornar se os dados do callback estiverem incompletos", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: { id: 123456789, is_bot: false, first_name: "João" },
        message: undefined,
        data: "confirm:teste",
        chat_instance: "123"
      } as unknown as TelegramBot.CallbackQuery;

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.editMessageText).not.toHaveBeenCalled();
      expect(mockBot.answerCallbackQuery).not.toHaveBeenCalled();
    });

    it("deve confirmar e salvar atividade", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message: {
          chat: { id: 123456789 },
          message_id: 456,
          date: 123456789
        },
        data: "confirm:Implementei uma nova funcionalidade",
        chat_instance: "123"
      } as TelegramBot.CallbackQuery;

      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João"
      };

      const mockActivity = {
        id: 42,
        content: "Implementei uma nova funcionalidade",
        date: new Date("2025-03-27T15:30:45Z"),
        userId: 1
      };

      (userExists as jest.Mock).mockResolvedValue(true);
      (getUserByTelegramId as jest.Mock).mockResolvedValue(mockUser);
      (createActivity as jest.Mock).mockResolvedValue(mockActivity);
      (formatTimestamp as jest.Mock).mockReturnValue("27/03/2025 15:30:45");

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(userExists).toHaveBeenCalledWith(123456789);
      expect(getUserByTelegramId).toHaveBeenCalledWith(123456789);
      expect(createActivity).toHaveBeenCalledWith(
        1,
        "Implementei uma nova funcionalidade"
      );
      expect(formatTimestamp).toHaveBeenCalledWith(mockActivity.date);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("Atividade registrada com sucesso"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: 456
        })
      );
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        "123",
        expect.any(Object)
      );
    });

    it("deve lidar com edição", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message: {
          chat: { id: 123456789 },
          message_id: 456,
          date: 123456789
        },
        data: "edit",
        chat_instance: "123"
      } as TelegramBot.CallbackQuery;

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("envie sua mensagem corrigida"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: 456
        })
      );
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith("123");
    });

    it("deve lidar com cancelamento", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message: {
          chat: { id: 123456789 },
          message_id: 456,
          date: 123456789
        },
        data: "cancel",
        chat_instance: "123"
      } as TelegramBot.CallbackQuery;

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("cancelado"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: 456
        })
      );
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith("123");
    });

    it("deve lidar com erro quando usuário não é encontrado", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message: {
          chat: { id: 123456789 },
          message_id: 456,
          date: 123456789
        },
        data: "confirm:Implementei uma nova funcionalidade",
        chat_instance: "123"
      } as TelegramBot.CallbackQuery;

      (userExists as jest.Mock).mockResolvedValue(true);
      (getUserByTelegramId as jest.Mock).mockResolvedValue(null);

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Erro: Usuário não encontrado")
      );
      // Não devemos esperar answerCallbackQuery neste caso
    });

    it("deve lidar com erros durante o processamento", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message: {
          chat: { id: 123456789 },
          message_id: 456,
          date: 123456789
        },
        data: "confirm:Implementei uma nova funcionalidade",
        chat_instance: "123"
      } as TelegramBot.CallbackQuery;

      (getUserByTelegramId as jest.Mock).mockRejectedValue(
        new Error("Erro no banco de dados")
      );

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Ocorreu um erro ao processar sua solicitação")
      );
    });

    it("deve gerar brag document para o período de 1 dia", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message: {
          chat: { id: 123456789 },
          message_id: 456,
          date: 123456789
        },
        data: "brag:1",
        chat_instance: "123"
      } as TelegramBot.CallbackQuery;

      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva",
        username: "joaosilva"
      };

      const mockActivities = [
        {
          id: 42,
          content: "Implementei uma nova funcionalidade",
          date: new Date("2025-03-27T15:30:45Z"),
          userId: 1
        },
        {
          id: 43,
          content: "Corrigi bug crítico",
          date: new Date("2025-03-27T10:15:20Z"),
          userId: 1
        }
      ] as Activity[];

      (userExists as jest.Mock).mockResolvedValue(true);
      (getUserByTelegramId as jest.Mock).mockResolvedValue(mockUser);
      (getActivitiesByPeriod as jest.Mock).mockResolvedValue(mockActivities);
      (formatTimestamp as jest.Mock).mockReturnValue("27/03/2025 15:30:45");

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(userExists).toHaveBeenCalledWith(123456789);
      expect(getUserByTelegramId).toHaveBeenCalledWith(123456789);
      expect(getActivitiesByPeriod).toHaveBeenCalledWith(1, 1);

      // Verificar se a mensagem de "gerando" foi enviada primeiro
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("Gerando seu Brag Document"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: 456
        })
      );

      // Verificar se o documento formatado foi enviado depois
      const secondCallArgs = mockBot.editMessageText.mock.calls[1];
      expect(secondCallArgs[0]).toContain("Nome");
      expect(secondCallArgs[0]).toContain("João Silva");
      expect(secondCallArgs[0]).toContain("Username");
      expect(secondCallArgs[0]).toContain("@joaosilva");
      expect(secondCallArgs[0]).toContain(
        "| 📅 *Timestamp* | 📝 *Atividade* |"
      );

      // Verifica que a opção de parse_mode está correta
      expect(secondCallArgs[1]).toEqual(
        expect.objectContaining({
          chat_id: 123456789,
          message_id: 456,
          parse_mode: "Markdown"
        })
      );

      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        "123",
        expect.any(Object)
      );
    });

    it("deve mostrar mensagem quando não há atividades no período", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message: {
          chat: { id: 123456789 },
          message_id: 456,
          date: 123456789
        },
        data: "brag:7",
        chat_instance: "123"
      } as TelegramBot.CallbackQuery;

      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João"
      };

      (userExists as jest.Mock).mockResolvedValue(true);
      (getUserByTelegramId as jest.Mock).mockResolvedValue(mockUser);
      (getActivitiesByPeriod as jest.Mock).mockResolvedValue([]);

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(getActivitiesByPeriod).toHaveBeenCalledWith(1, 7);

      // Verificar segunda chamada com mensagem de sem atividades
      const secondCallArgs = mockBot.editMessageText.mock.calls[1];
      expect(secondCallArgs[0]).toContain("não encontrei nenhuma atividade");

      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        "123",
        expect.objectContaining({
          text: "Nenhuma atividade encontrada"
        })
      );
    });

    it("deve lidar com erro ao gerar brag document", async () => {
      // Arrange
      const callbackQuery = {
        id: "123",
        from: {
          id: 123456789,
          first_name: "João",
          is_bot: false
        },
        message: {
          chat: { id: 123456789 },
          message_id: 456,
          date: 123456789
        },
        data: "brag:30",
        chat_instance: "123"
      } as TelegramBot.CallbackQuery;

      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João"
      };

      const dbError = new Error("Erro ao buscar atividades");

      (userExists as jest.Mock).mockResolvedValue(true);
      (getUserByTelegramId as jest.Mock).mockResolvedValue(mockUser);
      (getActivitiesByPeriod as jest.Mock).mockRejectedValue(dbError);

      // Act
      await handleCallbackQuery(mockBot, callbackQuery);

      // Assert
      expect(getActivitiesByPeriod).toHaveBeenCalledWith(1, 30);
      expect(console.error).toHaveBeenCalled();

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("ocorreu um erro ao gerar seu Brag Document"),
        expect.objectContaining({
          chat_id: 123456789,
          message_id: 456
        })
      );

      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        "123",
        expect.objectContaining({
          text: "Erro ao gerar documento"
        })
      );
    });
  });
});
