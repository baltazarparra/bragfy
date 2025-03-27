import {
  createActivity,
  formatTimestamp,
  getActivitiesByPeriod
} from "../../src/utils/activityUtils";
import { prisma } from "../../src/db/client";

// Mock do módulo Prisma
jest.mock("../../src/db/client", () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    },
    activity: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  }
}));

describe("Utilidades de Atividade", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configurar spy para console.error
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("createActivity", () => {
    it("deve criar uma atividade para um usuário válido", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva"
      };

      const mockActivity = {
        id: 42,
        content: "Implementei uma nova funcionalidade",
        date: new Date("2025-03-27T15:30:45Z"),
        userId: 1,
        createdAt: new Date("2025-03-27T15:30:45Z"),
        updatedAt: new Date("2025-03-27T15:30:45Z")
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activity.create as jest.Mock).mockResolvedValue(mockActivity);

      // Act
      const result = await createActivity(
        1,
        "Implementei uma nova funcionalidade"
      );

      // Assert
      expect(result).toEqual(mockActivity);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: {
          content: "Implementei uma nova funcionalidade",
          userId: 1
        }
      });
    });

    it("deve lançar um erro quando o usuário não existe", async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        createActivity(999, "Implementei uma nova funcionalidade")
      ).rejects.toThrow("Usuário não encontrado");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 999 }
      });
      expect(prisma.activity.create).not.toHaveBeenCalled();
    });

    it("deve lidar com erros na criação da atividade", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva"
      };

      const dbError = new Error("Erro ao criar atividade no banco de dados");

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.activity.create as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        createActivity(1, "Implementei uma nova funcionalidade")
      ).rejects.toThrow(dbError);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(prisma.activity.create).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "Erro ao criar atividade:",
        dbError
      );
    });
  });

  describe("getActivitiesByPeriod", () => {
    // Mock para data atual para garantir consistência nos testes
    const currentDate = new Date("2025-03-27T15:30:45Z");

    beforeEach(() => {
      // Mock da data atual para testes consistentes
      jest.spyOn(global, "Date").mockImplementation(() => currentDate);
    });

    afterEach(() => {
      // Restaura a implementação original de Date
      jest.restoreAllMocks();
    });

    it("deve buscar atividades para o período de 1 dia (hoje)", async () => {
      // Arrange
      const userId = 1;
      const days = 1;

      const mockActivities = [
        {
          id: 42,
          content: "Implementei uma nova funcionalidade",
          date: new Date("2025-03-27T14:30:45Z"),
          userId: 1,
          createdAt: new Date("2025-03-27T14:30:45Z"),
          updatedAt: new Date("2025-03-27T14:30:45Z")
        },
        {
          id: 43,
          content: "Corrigi bug crítico",
          date: new Date("2025-03-27T10:15:20Z"),
          userId: 1,
          createdAt: new Date("2025-03-27T10:15:20Z"),
          updatedAt: new Date("2025-03-27T10:15:20Z")
        }
      ];

      (prisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);

      // Act
      const result = await getActivitiesByPeriod(userId, days);

      // Assert
      expect(result).toEqual(mockActivities);

      // Verifica apenas que a função foi chamada
      expect(prisma.activity.findMany).toHaveBeenCalled();

      // Verifica que os parâmetros básicos estão corretos sem verificar as datas exatas
      const call = (prisma.activity.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.userId).toBe(userId);
      expect(call.orderBy.date).toBe("desc");

      // Verifica que existem datas nos parâmetros
      expect(call.where.date.gte).toBeDefined();
      expect(call.where.date.lte).toBeDefined();
    });

    it("deve buscar atividades para o período de 7 dias", async () => {
      // Arrange
      const userId = 1;
      const days = 7;

      const mockActivities = [
        {
          id: 42,
          content: "Implementei uma nova funcionalidade",
          date: new Date("2025-03-27T14:30:45Z"),
          userId: 1,
          createdAt: new Date("2025-03-27T14:30:45Z"),
          updatedAt: new Date("2025-03-27T14:30:45Z")
        },
        {
          id: 40,
          content: "Atualizei documentação",
          date: new Date("2025-03-22T09:30:45Z"),
          userId: 1,
          createdAt: new Date("2025-03-22T09:30:45Z"),
          updatedAt: new Date("2025-03-22T09:30:45Z")
        }
      ];

      (prisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);

      // Act
      const result = await getActivitiesByPeriod(userId, days);

      // Assert
      expect(result).toEqual(mockActivities);

      // Verifica que foi feita a busca com os parâmetros corretos
      const call = (prisma.activity.findMany as jest.Mock).mock.calls[0][0];

      // Calcula a data esperada (6 dias atrás, início do dia)
      const expectedStartDate = new Date("2025-03-21T00:00:00Z");

      // A data de início deve ser de 6 dias atrás (7-1 para incluir hoje)
      expect(call.where.date.gte.getDate()).toBe(expectedStartDate.getDate());
      expect(call.where.date.gte.getMonth()).toBe(expectedStartDate.getMonth());
    });

    it("deve retornar array vazio quando não há atividades no período", async () => {
      // Arrange
      const userId = 1;
      const days = 30;

      (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await getActivitiesByPeriod(userId, days);

      // Assert
      expect(result).toEqual([]);
      expect(prisma.activity.findMany).toHaveBeenCalled();
    });

    it("deve lidar com erros na busca de atividades", async () => {
      // Arrange
      const userId = 1;
      const days = 7;

      const dbError = new Error("Erro ao buscar atividades no banco");
      (prisma.activity.findMany as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(getActivitiesByPeriod(userId, days)).rejects.toThrow(
        dbError
      );

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao buscar atividades dos últimos 7 dias"),
        dbError
      );
    });
  });

  describe("formatTimestamp", () => {
    it("deve formatar corretamente o timestamp", () => {
      // Arrange
      const date = new Date("2025-03-27T15:30:45Z");

      // Act
      const result = formatTimestamp(date);

      // Assert
      // Nota: o resultado pode variar dependendo do fuso horário, então precisamos ajustar o teste
      // aqui estamos usando uma abordagem simplificada
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);

      // Verifica partes específicas
      const parts = result.split(" ");
      const dateParts = parts[0].split("/");
      expect(dateParts[0].length).toBe(2); // Dia com 2 dígitos
      expect(dateParts[1].length).toBe(2); // Mês com 2 dígitos
      expect(dateParts[2].length).toBe(4); // Ano com 4 dígitos

      const timeParts = parts[1].split(":");
      expect(timeParts[0].length).toBe(2); // Hora com 2 dígitos
      expect(timeParts[1].length).toBe(2); // Minuto com 2 dígitos
      expect(timeParts[2].length).toBe(2); // Segundo com 2 dígitos
    });

    it("deve adicionar zero à esquerda em números com um dígito", () => {
      // Arrange - criando uma data com valores de um dígito (1/1/2025 1:02:03)
      const date = new Date(2025, 0, 1, 1, 2, 3);

      // Act
      const result = formatTimestamp(date);

      // Assert
      expect(result).toBe("01/01/2025 01:02:03");
    });
  });
});
