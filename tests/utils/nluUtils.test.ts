import {
  classifyMessage,
  isPdfRequest,
  isBragTextRequest
} from "../../src/utils/nluUtils";

// Mock para o NlpManager
jest.mock("node-nlp", () => {
  const originalModule = jest.requireActual("node-nlp");

  // Mock simplificado que simula o processamento NLU para testes mais rápidos
  class MockNlpManager {
    languages: string[] = ["pt"];
    documents: any[] = [];

    constructor() {}

    addDocument(language: string, text: string, intent: string) {
      this.documents.push({ language, text, intent });
    }

    async train() {
      // Nada a fazer no mock
      return;
    }

    async process(language: string, text: string) {
      // Simulação simples de correspondência de intenções
      const lowerText = text.toLowerCase();

      // Mensagens específicas de teste que devem retornar sem intenção
      const activityMessages = [
        "hoje eu completei o relatório financeiro",
        "reunião com o cliente x deu super certo",
        "resolvi o bug no sistema de login",
        "finalizei a apresentação para amanhã",
        "comecei o novo projeto",
        "hoje eu implementei uma nova feature"
      ];

      if (activityMessages.includes(lowerText)) {
        return { intent: "", score: 0.3 }; // Score baixo
      }

      // PDF intent
      if (
        lowerText.includes("pdf") ||
        lowerText.includes("arquivo") ||
        (lowerText.includes("gerar") && lowerText.includes("pdf"))
      ) {
        return { intent: "generate_pdf", score: 0.95 };
      }

      // Brag intent - específico para comandos de geração de relatório/documento
      const bragPatterns = [
        "gerar brag",
        "criar brag",
        "brag document",
        "quero ver meu brag",
        "gerar relatório",
        "criar documento",
        "quero ver meu documento",
        "criar relatório",
        "gerar texto do brag",
        "texto do brag"
      ];

      const isBragCommand = bragPatterns.some((pattern) =>
        lowerText.includes(pattern)
      );

      if (isBragCommand) {
        return { intent: "generate_brag_text", score: 0.9 };
      }

      // Nenhuma intenção reconhecida
      return { intent: "", score: 0.0 };
    }
  }

  return {
    ...originalModule,
    NlpManager: MockNlpManager
  };
});

describe("NLU Utils", () => {
  describe("classifyMessage", () => {
    it("deve classificar corretamente mensagens de solicitação de PDF", async () => {
      // Testa várias expressões que devem ser classificadas como solicitação de PDF
      const variations = [
        "gerar um pdf",
        "criar pdf",
        "pdf por favor",
        "quero um pdf",
        "gerar PDF",
        "criar um arquivo",
        "GERAR pdf",
        "faz um pdf pra mim"
      ];

      for (const message of variations) {
        const result = await classifyMessage(message);
        expect(result).not.toBeNull();
        expect(result?.intent).toBe("generate_pdf");
        expect(result?.score).toBeGreaterThan(0.65);
      }
    });

    it("deve classificar corretamente mensagens de solicitação de Brag Document", async () => {
      // Testa várias expressões que devem ser classificadas como solicitação de Brag Document
      const variations = [
        "gerar brag",
        "criar brag",
        "brag document",
        "quero ver meu brag",
        "gerar relatório",
        "criar documento",
        "gerar texto do brag"
      ];

      for (const message of variations) {
        const result = await classifyMessage(message);
        expect(result).not.toBeNull();
        expect(result?.intent).toBe("generate_brag_text");
        expect(result?.score).toBeGreaterThan(0.65);
      }
    });

    it("deve retornar null para mensagens que não têm intenção clara", async () => {
      // Mensagens normais do usuário que devem ser tratadas como atividades, não como comandos
      const variations = [
        "Hoje eu completei o relatório financeiro",
        "Reunião com o cliente X deu super certo",
        "Resolvi o bug no sistema de login",
        "Finalizei a apresentação para amanhã",
        "Comecei o novo projeto"
      ];

      for (const message of variations) {
        const result = await classifyMessage(message);
        expect(result).toBeNull();
      }
    });
  });

  describe("isPdfRequest", () => {
    it("deve identificar solicitações de PDF", async () => {
      expect(await isPdfRequest("quero gerar um pdf")).toBe(true);
      expect(await isPdfRequest("criar pdf")).toBe(true);
      expect(await isPdfRequest("pdf por favor")).toBe(true);
    });

    it("não deve identificar solicitações não relacionadas a PDF", async () => {
      expect(await isPdfRequest("registrar atividade")).toBe(false);
      expect(await isPdfRequest("Hoje eu fiz uma apresentação")).toBe(false);
    });
  });

  describe("isBragTextRequest", () => {
    it("deve identificar solicitações de Brag Document", async () => {
      expect(await isBragTextRequest("gerar brag")).toBe(true);
      expect(await isBragTextRequest("quero ver meu documento")).toBe(true);
      expect(await isBragTextRequest("criar relatório")).toBe(true);
    });

    it("não deve identificar solicitações não relacionadas a Brag Document", async () => {
      expect(await isBragTextRequest("gerar pdf")).toBe(false);
      expect(
        await isBragTextRequest("Hoje eu implementei uma nova feature")
      ).toBe(false);
    });
  });
});
