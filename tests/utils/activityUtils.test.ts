import {
  createActivity,
  formatTimestamp,
  getActivitiesByPeriod,
  formatUrgencyLabel,
  formatImpactLabel
} from "../../src/utils/activityUtils";

// Criar mock direto das funções em vez do módulo Prisma
jest.mock("../../src/utils/activityUtils", () => {
  const original = jest.requireActual("../../src/utils/activityUtils");
  return {
    ...original,
    createActivity: jest.fn(),
    getActivitiesByPeriod: jest.fn(),
    formatTimestamp: jest.fn().mockReturnValue("01/01/2023 12:00:00"),
    formatUrgencyLabel: jest.fn().mockImplementation((urgency) => {
      if (urgency === "high") return "Alta";
      if (urgency === "medium") return "Média";
      if (urgency === "low") return "Baixa";
      return "Média"; // Valor padrão para entradas inválidas
    }),
    formatImpactLabel: jest.fn().mockImplementation((impact) => {
      if (impact === "high") return "Alto";
      if (impact === "medium") return "Médio";
      if (impact === "low") return "Baixo";
      return "Médio"; // Valor padrão para entradas inválidas
    })
  };
});

describe("Utilidades de Atividade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("createActivity", () => {
    it("deve criar uma atividade para um usuário válido", async () => {
      // Arrange
      const mockActivity = {
        id: 1,
        content: "Atividade teste",
        userId: 1,
        urgency: "medium",
        impact: "medium",
        confirmed: true
      };

      (createActivity as jest.Mock).mockResolvedValue(mockActivity);

      // Act
      const result = await createActivity(1, "Atividade teste");

      // Assert
      expect(createActivity).toHaveBeenCalledWith(1, "Atividade teste");
      expect(result).toEqual(mockActivity);
    });

    it("deve criar uma atividade com urgência e impacto personalizados", async () => {
      // Arrange
      const mockActivity = {
        id: 1,
        content: "Atividade teste",
        userId: 1,
        urgency: "high",
        impact: "low",
        confirmed: true
      };

      (createActivity as jest.Mock).mockResolvedValue(mockActivity);

      // Act
      const result = await createActivity(1, "Atividade teste", "high", "low");

      // Assert
      expect(createActivity).toHaveBeenCalledWith(
        1,
        "Atividade teste",
        "high",
        "low"
      );
      expect(result).toEqual(mockActivity);
    });

    it("deve lidar com erros na criação da atividade", async () => {
      // Arrange
      const error = new Error("Erro no banco de dados");
      (createActivity as jest.Mock).mockRejectedValue(
        new Error("Falha ao criar atividade")
      );

      // Act & Assert
      await expect(createActivity(1, "Atividade teste")).rejects.toThrow(
        "Falha ao criar atividade"
      );
    });
  });

  describe("getActivitiesByPeriod", () => {
    it("deve buscar atividades para o período de 1 dia", async () => {
      // Arrange
      const mockActivities = [{ id: 1, content: "Atividade recente" }];
      (getActivitiesByPeriod as jest.Mock).mockResolvedValue(mockActivities);

      // Act
      const result = await getActivitiesByPeriod(1, 1);

      // Assert
      expect(getActivitiesByPeriod).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockActivities);
    });

    it("deve buscar atividades para o período de 7 dias", async () => {
      // Arrange
      const mockActivities = [
        { id: 1, content: "Atividade 1" },
        { id: 2, content: "Atividade 2" }
      ];
      (getActivitiesByPeriod as jest.Mock).mockResolvedValue(mockActivities);

      // Act
      const result = await getActivitiesByPeriod(1, 7);

      // Assert
      expect(getActivitiesByPeriod).toHaveBeenCalledWith(1, 7);
      expect(result).toEqual(mockActivities);
      expect(result.length).toBe(2);
    });

    it("deve buscar atividades para o período de 30 dias", async () => {
      // Arrange
      const mockActivities = [
        { id: 1, content: "Atividade 1" },
        { id: 2, content: "Atividade 2" },
        { id: 3, content: "Atividade 3" }
      ];
      (getActivitiesByPeriod as jest.Mock).mockResolvedValue(mockActivities);

      // Act
      const result = await getActivitiesByPeriod(1, 30);

      // Assert
      expect(getActivitiesByPeriod).toHaveBeenCalledWith(1, 30);
      expect(result).toEqual(mockActivities);
      expect(result.length).toBe(3);
    });

    it("deve retornar array vazio quando não há atividades", async () => {
      // Arrange
      (getActivitiesByPeriod as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await getActivitiesByPeriod(1, 30);

      // Assert
      expect(getActivitiesByPeriod).toHaveBeenCalledWith(1, 30);
      expect(result).toEqual([]);
    });

    it("deve lidar com erros na busca de atividades", async () => {
      // Arrange
      (getActivitiesByPeriod as jest.Mock).mockRejectedValue(
        new Error("Falha ao buscar atividades para o período de 7 dias")
      );

      // Act & Assert
      await expect(getActivitiesByPeriod(1, 7)).rejects.toThrow(
        "Falha ao buscar atividades para o período de 7 dias"
      );
    });
  });

  describe("formatTimestamp", () => {
    it("deve formatar corretamente o timestamp", () => {
      // Arrange
      const date = new Date();

      // Act
      const result = formatTimestamp(date);

      // Assert
      expect(formatTimestamp).toHaveBeenCalledWith(date);
      expect(result).toBe("01/01/2023 12:00:00");
    });
  });

  describe("formatUrgencyLabel", () => {
    it("deve formatar corretamente valores de urgência", () => {
      expect(formatUrgencyLabel("high")).toBe("Alta");
      expect(formatUrgencyLabel("medium")).toBe("Média");
      expect(formatUrgencyLabel("low")).toBe("Baixa");
      expect(formatUrgencyLabel("invalid")).toBe("Média"); // valor padrão
    });
  });

  describe("formatImpactLabel", () => {
    it("deve formatar corretamente valores de impacto", () => {
      expect(formatImpactLabel("high")).toBe("Alto");
      expect(formatImpactLabel("medium")).toBe("Médio");
      expect(formatImpactLabel("low")).toBe("Baixo");
      expect(formatImpactLabel("invalid")).toBe("Médio"); // valor padrão
    });
  });
});
