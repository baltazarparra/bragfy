import {
  classifyMessage,
  isPdfRequest,
  isBragTextRequest,
  NluResult
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

      // Comando de PDF específico solicitado nos requisitos
      if (lowerText === "quero gerar um pdf do meu brag") {
        return { intent: "generate_pdf", score: 1.0 };
      }

      // Comando de Brag específico solicitado nos requisitos
      if (lowerText === "quero ver meu documento") {
        return { intent: "generate_brag_text", score: 1.0 };
      }

      // Mensagens específicas de teste que devem retornar sem intenção
      const activityMessages = [
        "hoje eu completei o relatório financeiro",
        "reunião com o cliente x deu super certo",
        "resolvi o bug no sistema de login",
        "finalizei a apresentação para amanhã",
        "comecei o novo projeto",
        "hoje eu implementei uma nova feature",
        "fui ao mercado hoje"
      ];

      if (activityMessages.includes(lowerText)) {
        return { intent: "", score: 0.3 }; // Score baixo
      }

      // Casos de falsos positivos que queremos evitar, mas que o modelo NLU original
      // poderia classificar erroneamente com alta confiança
      const falsePosWithHighScoreCases = [
        "estou com dor no abdomen",
        "ouvindo um los hermanos",
        "tive uma reunião com o time",
        "resolvendo um bug",
        "correndo atrás de metas",
        "sinto-me cansado hoje"
      ];

      if (falsePosWithHighScoreCases.includes(lowerText)) {
        // Simulamos que o modelo dá pontuação alta com a intent de PDF
        return { intent: "generate_pdf", score: 1.0 };
      }

      // Verificação mais restrita para PDF - deve incluir contexto de brag/documento
      if (
        (lowerText.includes("pdf") &&
          (lowerText.includes("brag") ||
            lowerText.includes("documento") ||
            lowerText.includes("gerar") ||
            lowerText.includes("criar") ||
            lowerText.includes("quero"))) ||
        (lowerText.includes("arquivo") &&
          (lowerText.includes("brag") || lowerText.includes("documento"))) ||
        lowerText === "gerar meu documento" ||
        lowerText === "quero meu brag document" ||
        lowerText === "gerar documento"
      ) {
        return { intent: "generate_pdf", score: 0.95 };
      }

      // Mensagem genérica só com "pdf" sem contexto - score abaixo do limite
      if (lowerText === "pdf" || lowerText === "pdf por favor") {
        return { intent: "generate_pdf", score: 0.7 };
      }

      // Brag intent - específico para comandos de geração de relatório/documento
      const bragPatterns = [
        "gerar brag",
        "criar brag",
        "brag document",
        "quero ver meu brag",
        "gerar relatório",
        "criar documento",
        "criar relatório",
        "gerar texto do brag",
        "texto do brag",
        "gerar resumo",
        "ver resumo",
        "gerar meu resumo",
        "me mostra meu resumo",
        "resumo das minhas atividades"
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

    // Mock para suporte a persistência do modelo
    async save(path: string) {
      return true;
    }

    async load(path: string) {
      return true;
    }
  }

  return {
    ...originalModule,
    NlpManager: MockNlpManager
  };
});

// Mock para file system
jest.mock("fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn()
}));

describe("NLU Utils", () => {
  describe("classifyMessage", () => {
    it("deve classificar corretamente mensagens de solicitação de PDF", async () => {
      // Exemplo que deve passar sem ser marcado como falso positivo
      const result = await classifyMessage("quero gerar um pdf do meu brag");
      expect(result).not.toBeNull();
      expect(result?.intent).toBe("generate_pdf");
      expect(result?.score).toBeGreaterThan(0.85);
      expect(result?.isFalsePositive).toBe(false);
    });

    it("deve classificar corretamente mensagens de solicitação de Brag Document", async () => {
      // Exemplo que deve passar sem ser marcado como falso positivo
      const result = await classifyMessage("quero ver meu documento");
      expect(result).not.toBeNull();
      expect(result?.intent).toBe("generate_brag_text");
      expect(result?.score).toBeGreaterThan(0.85);
      expect(result?.isFalsePositive).toBe(false);
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

    it("deve marcar falsos positivos com alta confiança mas manter intent", async () => {
      // Mensagens que o modelo classificaria erroneamente com alta confiança
      const variations = [
        "Estou com dor no abdomen",
        "Ouvindo um los hermanos",
        "Tive uma reunião com o time",
        "Resolvendo um bug",
        "Correndo atrás de metas"
      ];

      for (const message of variations) {
        const result = await classifyMessage(message);
        expect(result).not.toBeNull();
        expect(result?.intent).toBe("generate_pdf"); // Mantém a intenção
        expect(result?.score).toBe(1.0); // Mantém a confiança
        expect(result?.isFalsePositive).toBe(true); // Marca como falso positivo
      }
    });
  });

  describe("isPdfRequest", () => {
    it("deve identificar solicitações de PDF legítimas", async () => {
      const result = await isPdfRequest("quero gerar um pdf do meu brag");
      expect(result.isMatch).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.intent).toBe("generate_pdf");
    });

    it("deve identificar solicitações de documento", async () => {
      const documentVariations = [
        "gerar meu documento",
        "quero meu brag document",
        "gerar documento"
      ];

      for (const variation of documentVariations) {
        const result = await isPdfRequest(variation);
        expect(result.isMatch).toBe(true);
        expect(result.intent).toBe("generate_pdf");
        expect(result.confidence).toBeGreaterThan(0.85);
      }
    });

    it("não deve identificar solicitações não relacionadas a PDF", async () => {
      const result1 = await isPdfRequest("registrar atividade");
      expect(result1.isMatch).toBe(false);

      const result2 = await isPdfRequest("Hoje eu fiz uma apresentação");
      expect(result2.isMatch).toBe(false);

      // Agora "pdf" simples não deve mais ativar o fluxo de PDF
      const result3 = await isPdfRequest("pdf por favor");
      expect(result3.isMatch).toBe(false);
    });

    it("deve rejeitar falsos positivos mantendo a intenção e confiança original para depuração", async () => {
      // Caso específico solicitado: "Estou com dor no abdomen"
      const result1 = await isPdfRequest("Estou com dor no abdomen");
      expect(result1.isMatch).toBe(false); // Não deve acionar o fluxo de PDF
      expect(result1.intent).toBe("generate_pdf"); // Deve manter a intenção original
      expect(result1.confidence).toBe(1.0); // Deve manter a confiança original

      // Caso específico solicitado: "Ouvindo um los hermanos"
      const result2 = await isPdfRequest("Ouvindo um los hermanos");
      expect(result2.isMatch).toBe(false); // Não deve acionar o fluxo de PDF
      expect(result2.intent).toBe("generate_pdf"); // Deve manter a intenção original
      expect(result2.confidence).toBe(1.0); // Deve manter a confiança original
    });
  });

  describe("isBragTextRequest", () => {
    it("deve identificar solicitações de Brag Document", async () => {
      const result = await isBragTextRequest("quero ver meu documento");
      expect(result.isMatch).toBe(true);
      expect(result.intent).toBe("generate_brag_text");
      expect(result.confidence).toBe(1.0);
    });

    it("deve identificar solicitações de resumo", async () => {
      const resumoVariations = [
        "gerar resumo",
        "ver resumo",
        "gerar meu resumo",
        "me mostra meu resumo",
        "resumo das minhas atividades"
      ];

      for (const variation of resumoVariations) {
        const result = await isBragTextRequest(variation);
        expect(result.isMatch).toBe(true);
        expect(result.intent).toBe("generate_brag_text");
        expect(result.confidence).toBeGreaterThan(0.85);
      }
    });

    it("não deve identificar solicitações não relacionadas a Brag Document", async () => {
      const result1 = await isBragTextRequest("gerar pdf");
      expect(result1.isMatch).toBe(false);

      const result2 = await isBragTextRequest(
        "Hoje eu implementei uma nova feature"
      );
      expect(result2.isMatch).toBe(false);

      // Teste específico com um falso positivo
      const result3 = await isBragTextRequest("Tive uma reunião com o time");
      expect(result3.isMatch).toBe(false);
    });
  });

  describe("requisitos específicos de falsos positivos", () => {
    it("deve rejeitar 'Estou com dor no abdomen' como comando", async () => {
      const result = await isPdfRequest("Estou com dor no abdomen");
      expect(result.isMatch).toBe(false);
      expect(result.intent).toBe("generate_pdf");
      expect(result.confidence).toBe(1.0);
    });

    it("deve rejeitar 'Ouvindo um los hermanos' como comando", async () => {
      const result = await isPdfRequest("Ouvindo um los hermanos");
      expect(result.isMatch).toBe(false);
      expect(result.intent).toBe("generate_pdf");
      expect(result.confidence).toBe(1.0);
    });

    it("deve aceitar 'quero gerar um PDF do meu brag' como comando de PDF", async () => {
      const result = await isPdfRequest("quero gerar um pdf do meu brag");
      expect(result.isMatch).toBe(true);
      expect(result.intent).toBe("generate_pdf");
      expect(result.confidence).toBe(1.0);
    });

    it("deve aceitar 'quero ver meu documento' como comando de Brag", async () => {
      const result = await isBragTextRequest("quero ver meu documento");
      expect(result.isMatch).toBe(true);
      expect(result.intent).toBe("generate_brag_text");
      expect(result.confidence).toBe(1.0);
    });
  });
});
