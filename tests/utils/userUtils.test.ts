import {
  userExists,
  createUser,
  getUserByTelegramId,
  saveUserAnalysis,
  getUserAnalyses
} from "../../src/utils/userUtils";
import { prisma } from "../../src/db/client";

// Mock do módulo Prisma
jest.mock("../../src/db/client", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    userAnalysis: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    },
    $transaction: jest.fn(async (callback) => {
      return callback(prisma);
    })
  } as any
}));

describe("Utilidades de Usuário", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("userExists", () => {
    it("deve retornar true quando o usuário existe", async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva"
      });

      // Act
      const result = await userExists(123456789);

      // Assert
      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 }
      });
    });

    it("deve retornar false quando o usuário não existe", async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await userExists(123456789);

      // Assert
      expect(result).toBe(false);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 }
      });
    });

    it("retorna false em caso de erro no banco de dados", async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("Erro de banco de dados")
      );

      const exists = await userExists(123456789);
      expect(exists).toBe(false);
    });
  });

  describe("createUser", () => {
    it("deve criar um usuário com base nos dados do Telegram", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva",
        username: "joaosilva",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const telegramUser = {
        id: 123456789,
        first_name: "João",
        last_name: "Silva",
        username: "joaosilva",
        is_bot: false
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await createUser(telegramUser);

      // Assert
      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          telegramId: 123456789,
          firstName: "João",
          lastName: "Silva",
          username: "joaosilva"
        }
      });
    });

    it("deve lidar com dados parciais do Telegram", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: null,
        username: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const telegramUser = {
        id: 123456789,
        first_name: "João",
        is_bot: false
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await createUser(telegramUser);

      // Assert
      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          telegramId: 123456789,
          firstName: "João",
          lastName: null,
          username: null
        }
      });
    });
  });

  describe("getUserByTelegramId", () => {
    it("deve retornar um usuário pelo ID do Telegram", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva",
        username: "joaosilva",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await getUserByTelegramId(123456789);

      // Assert
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 }
      });
    });

    it("deve retornar null quando o usuário não existe", async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getUserByTelegramId(123456789);

      // Assert
      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 }
      });
    });

    it("retorna null em caso de erro no banco de dados", async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("Erro de banco de dados")
      );

      const user = await getUserByTelegramId(123456789);
      expect(user).toBeNull();
    });
  });

  describe("saveUserAnalysis", () => {
    it("deve salvar uma nova análise quando o usuário não tem análises anteriores", async () => {
      // Mock para zero análises existentes
      ((prisma as any).userAnalysis.count as jest.Mock).mockResolvedValue(0);

      // Mock para criação de análise
      const mockAnalysis = {
        id: "analysis-1",
        userId: 1,
        telegramId: 123456789,
        content: "Análise de perfil profissional",
        createdAt: new Date()
      };

      ((prisma as any).userAnalysis.create as jest.Mock).mockResolvedValue(
        mockAnalysis
      );

      // Executa a função
      const result = await saveUserAnalysis(
        1,
        123456789,
        "Análise de perfil profissional"
      );

      // Verifica resultados
      expect(result).toEqual(mockAnalysis);
      expect((prisma as any).userAnalysis.count).toHaveBeenCalledWith({
        where: { userId: 1 }
      });

      // Não deve tentar buscar a análise mais antiga
      expect((prisma as any).userAnalysis.findFirst).not.toHaveBeenCalled();

      // Não deve tentar excluir nenhuma análise
      expect((prisma as any).userAnalysis.delete).not.toHaveBeenCalled();

      // Deve criar a nova análise
      expect((prisma as any).userAnalysis.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          telegramId: 123456789,
          content: "Análise de perfil profissional"
        }
      });
    });

    it("deve manter apenas as 3 análises mais recentes excluindo a mais antiga", async () => {
      // Mock para três análises existentes
      ((prisma as any).userAnalysis.count as jest.Mock).mockResolvedValue(3);

      // Mock para a análise mais antiga
      const oldestAnalysis = {
        id: "analysis-oldest",
        userId: 1,
        telegramId: 123456789,
        content: "Análise antiga",
        createdAt: new Date("2023-01-01")
      };

      ((prisma as any).userAnalysis.findFirst as jest.Mock).mockResolvedValue(
        oldestAnalysis
      );

      // Mock para a exclusão da análise mais antiga
      ((prisma as any).userAnalysis.delete as jest.Mock).mockResolvedValue({});

      // Mock para criação da nova análise
      const newAnalysis = {
        id: "analysis-new",
        userId: 1,
        telegramId: 123456789,
        content: "Nova análise de perfil",
        createdAt: new Date()
      };

      ((prisma as any).userAnalysis.create as jest.Mock).mockResolvedValue(
        newAnalysis
      );

      // Executa a função
      const result = await saveUserAnalysis(
        1,
        123456789,
        "Nova análise de perfil"
      );

      // Verifica resultados
      expect(result).toEqual(newAnalysis);

      // Deve buscar a análise mais antiga
      expect((prisma as any).userAnalysis.findFirst).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: "asc" }
      });

      // Deve excluir a análise mais antiga
      expect((prisma as any).userAnalysis.delete).toHaveBeenCalledWith({
        where: { id: "analysis-oldest" }
      });

      // Deve criar a nova análise
      expect((prisma as any).userAnalysis.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          telegramId: 123456789,
          content: "Nova análise de perfil"
        }
      });
    });

    it("deve capturar erros ao salvar a análise", async () => {
      // Mock para simular erro no banco de dados
      ((prisma as any).userAnalysis.count as jest.Mock).mockRejectedValue(
        new Error("Erro de banco de dados")
      );

      // Executa e verifica que o erro é propagado
      await expect(
        saveUserAnalysis(1, 123456789, "Análise com erro")
      ).rejects.toThrow("Erro de banco de dados");
    });
  });

  describe("getUserAnalyses", () => {
    it("deve retornar as análises do usuário ordenadas da mais recente para a mais antiga", async () => {
      // Mock para análises
      const mockAnalyses = [
        {
          id: "analysis-3",
          userId: 1,
          telegramId: 123456789,
          content: "Análise mais recente",
          createdAt: new Date("2024-01-03")
        },
        {
          id: "analysis-2",
          userId: 1,
          telegramId: 123456789,
          content: "Análise intermediária",
          createdAt: new Date("2024-01-02")
        },
        {
          id: "analysis-1",
          userId: 1,
          telegramId: 123456789,
          content: "Análise mais antiga",
          createdAt: new Date("2024-01-01")
        }
      ];

      ((prisma as any).userAnalysis.findMany as jest.Mock).mockResolvedValue(
        mockAnalyses
      );

      // Executa a função
      const results = await getUserAnalyses(1);

      // Verifica resultados
      expect(results).toEqual(mockAnalyses);
      expect((prisma as any).userAnalysis.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: "desc" },
        take: 3
      });
    });

    it("deve limitar o número de análises retornadas conforme o parâmetro limit", async () => {
      // Mock para análises
      const mockAnalyses = [
        {
          id: "analysis-3",
          userId: 1,
          telegramId: 123456789,
          content: "Análise mais recente",
          createdAt: new Date("2024-01-03")
        },
        {
          id: "analysis-2",
          userId: 1,
          telegramId: 123456789,
          content: "Análise intermediária",
          createdAt: new Date("2024-01-02")
        }
      ];

      ((prisma as any).userAnalysis.findMany as jest.Mock).mockResolvedValue(
        mockAnalyses
      );

      // Executa a função com limit = 2
      const results = await getUserAnalyses(1, 2);

      // Verifica resultados
      expect(results).toEqual(mockAnalyses);
      expect((prisma as any).userAnalysis.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: "desc" },
        take: 2
      });
    });

    it("deve retornar array vazio quando ocorrer erro", async () => {
      // Mock para simular erro
      ((prisma as any).userAnalysis.findMany as jest.Mock).mockRejectedValue(
        new Error("Erro de banco de dados")
      );

      // Executa a função
      const results = await getUserAnalyses(1);

      // Verifica que retorna array vazio em caso de erro
      expect(results).toEqual([]);
    });
  });
});
