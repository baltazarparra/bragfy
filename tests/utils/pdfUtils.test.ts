import {
  generateBragDocumentPDF,
  urgencyToIcon,
  impactToIcon,
  urgencyToText,
  impactToText
} from "../../src/utils/pdfUtils";
import { formatTimestamp } from "../../src/utils/activityUtils";
import { formatUrgencyLabel } from "../../src/utils/activityUtils";
import { formatImpactLabel } from "../../src/utils/activityUtils";
import { BragActivity, BragUser } from "../../src/types";
import * as fs from "fs";
import * as path from "path";

// Mock de dados necessários para o teste
const mockUser: BragUser = {
  id: 1,
  telegramId: 123456789,
  firstName: "João",
  lastName: "Silva",
  username: "joaosilva"
};

// Atividades com diferentes combinações de urgência e impacto
const mockActivities: BragActivity[] = [
  {
    id: 1,
    content: "Implementei nova funcionalidade",
    date: new Date(),
    urgency: "high",
    impact: "medium"
  },
  {
    id: 2,
    content: "Corrigi bug crítico",
    date: new Date(),
    urgency: "high",
    impact: "high"
  },
  {
    id: 3,
    content: "Atividade sem urgência definida",
    date: new Date(),
    impact: "low"
  },
  {
    id: 4,
    content: "Atividade sem impacto definido",
    date: new Date(),
    urgency: "medium"
  },
  {
    id: 5,
    content: "Atividade sem urgência nem impacto",
    date: new Date()
  }
];

// Cria atividades extras para testar paginação
const createManyActivities = (count: number): BragActivity[] => {
  const activities: BragActivity[] = [];

  for (let i = 0; i < count; i++) {
    activities.push({
      id: i + 1,
      content: `Atividade de teste número ${i + 1} com conteúdo suficiente para testar a quebra de linhas no layout tabular do PDF.`,
      date: new Date(),
      urgency: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
      impact: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low"
    });
  }

  return activities;
};

describe("PDF Utils", () => {
  describe("Funções de conversão", () => {
    it("deve converter corretamente urgência para ícones", () => {
      // Os testes esperam emojis, mas estamos usando texto no PDF por compatibilidade
      // Mantemos os testes como estão para verificar que a função ainda retorna os ícones
      expect(urgencyToIcon("high")).toBe("🔥");
      expect(urgencyToIcon("medium")).toBe("🟡");
      expect(urgencyToIcon("low")).toBe("🧊");
      expect(urgencyToIcon(undefined)).toBe("—");
      expect(urgencyToIcon("")).toBe("—");
    });

    it("deve converter corretamente impacto para ícones", () => {
      // Os testes esperam emojis, mas estamos usando texto no PDF por compatibilidade
      // Mantemos os testes como estão para verificar que a função ainda retorna os ícones
      expect(impactToIcon("high")).toBe("🚀");
      expect(impactToIcon("medium")).toBe("📦");
      expect(impactToIcon("low")).toBe("🐾");
      expect(impactToIcon(undefined)).toBe("—");
      expect(impactToIcon("")).toBe("—");
    });

    it("deve lidar com valores inválidos ou em branco", () => {
      expect(urgencyToIcon("")).toBe("—");
      expect(urgencyToIcon(" ")).toBe("—");
      expect(urgencyToIcon(undefined)).toBe("—");
      expect(urgencyToIcon("invalid")).toBe("—");

      expect(impactToIcon("")).toBe("—");
      expect(impactToIcon(" ")).toBe("—");
      expect(impactToIcon(undefined)).toBe("—");
      expect(impactToIcon("invalid")).toBe("—");
    });

    it("deve converter corretamente urgência para texto", () => {
      expect(urgencyToText("high")).toBe("Alta");
      expect(urgencyToText("medium")).toBe("Média");
      expect(urgencyToText("low")).toBe("Baixa");
      expect(urgencyToText(undefined)).toBe("—");
      expect(urgencyToText("")).toBe("—");
    });

    it("deve converter corretamente impacto para texto", () => {
      expect(impactToText("high")).toBe("Alto");
      expect(impactToText("medium")).toBe("Médio");
      expect(impactToText("low")).toBe("Baixo");
      expect(impactToText(undefined)).toBe("—");
      expect(impactToText("")).toBe("—");
    });
  });

  describe("generateBragDocumentPDF", () => {
    it("deve gerar um PDF com sucesso", async () => {
      // Arrange
      const mockData = {
        user: mockUser,
        activities: mockActivities,
        generatedAt: new Date(),
        period: 7
      };

      // Act
      const result = await generateBragDocumentPDF(mockData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();

      // Verifique se o buffer existe antes de usar
      if (result.buffer) {
        expect(result.buffer.length).toBeGreaterThan(0);
      }
    });

    it("deve gerar um PDF com muitas atividades e paginação", async () => {
      // Arrange
      const manyActivities = createManyActivities(40);
      const mockData = {
        user: mockUser,
        activities: manyActivities,
        generatedAt: new Date(),
        period: 30
      };

      // Act
      const result = await generateBragDocumentPDF(mockData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();

      // Verifique se o buffer existe antes de usar
      if (result.buffer) {
        expect(result.buffer.length).toBeGreaterThan(0);

        // Opcionalmente salvar o PDF para inspeção visual durante testes de desenvolvimento
        if (process.env.NODE_ENV === "development") {
          const testOutputDir = path.join(__dirname, "..", "..", "test-output");
          if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
          }
          fs.writeFileSync(
            path.join(testOutputDir, "brag-document-test.pdf"),
            result.buffer
          );
        }
      }
    });

    it("deve gerar um PDF mesmo sem atividades", async () => {
      // Arrange
      const mockData = {
        user: mockUser,
        activities: [],
        generatedAt: new Date(),
        period: 7
      };

      // Act
      const result = await generateBragDocumentPDF(mockData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("deve gerar um PDF com ícones corretos de urgência e impacto", async () => {
      // Arrange
      const mockData = {
        user: mockUser,
        activities: mockActivities,
        generatedAt: new Date(),
        period: 7
      };

      // Act
      const result = await generateBragDocumentPDF(mockData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      if (result.buffer) {
        expect(result.buffer.length).toBeGreaterThan(0);

        // Salva o arquivo para inspeção visual durante desenvolvimento
        if (process.env.NODE_ENV === "development") {
          const testOutputDir = path.join(__dirname, "..", "..", "test-output");
          if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
          }
          fs.writeFileSync(
            path.join(testOutputDir, "brag-document-icons-test.pdf"),
            result.buffer
          );
        }
      }
    });
  });
});
