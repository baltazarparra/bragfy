import {
  formatActivitiesForPrompt,
  analyzeProfileWithLLM
} from "../../src/utils/llmUtils";
import { Activity } from "../../src/db/client";

describe("llmUtils", () => {
  // Salvar o fetch original para restaurar depois
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  // Limpar todos os mocks antes de cada teste
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock global de fetch
    global.fetch = jest.fn();
    // Configurar variável de ambiente para teste
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test-key";
  });

  afterEach(() => {
    // Restaurar fetch original
    global.fetch = originalFetch;
    // Restaurar variáveis de ambiente
    process.env = originalEnv;
  });

  describe("formatActivitiesForPrompt", () => {
    it("deve formatar corretamente as atividades para o prompt", () => {
      // Atividades mockadas para o teste
      const mockActivities = [
        {
          id: 1,
          userId: 123,
          content: "Reunião com stakeholders para definição de roadmap",
          createdAt: new Date("2024-04-01T10:00:00Z"),
          urgency: "high",
          impact: "high"
        },
        {
          id: 2,
          userId: 123,
          content: "Revisão técnica dos pull requests da API",
          createdAt: new Date("2024-04-03T14:30:00Z"),
          urgency: "medium",
          impact: "medium"
        }
      ] as Activity[];

      // Resultado esperado
      const expected =
        "• [2024-04-01] Reunião com stakeholders para definição de roadmap\n" +
        "• [2024-04-03] Revisão técnica dos pull requests da API";

      // Executa a função a ser testada
      const result = formatActivitiesForPrompt(mockActivities);

      // Verifica se o resultado corresponde ao esperado
      expect(result).toBe(expected);
    });

    it("deve lidar corretamente com lista vazia de atividades", () => {
      const result = formatActivitiesForPrompt([]);
      expect(result).toBe("");
    });
  });

  describe("analyzeProfileWithLLM", () => {
    it("deve retornar análise com sucesso quando a API responde corretamente", async () => {
      // Mock da resposta do fetch
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: "resp-123",
          choices: [
            {
              message: {
                role: "assistant",
                content:
                  "Análise do perfil profissional baseada nas atividades fornecidas."
              }
            }
          ]
        })
      };

      // Configure o mock do fetch
      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockResponse as unknown as Response);

      // Texto de atividades para análise
      const activitiesText =
        "• [2024-04-01] Reunião com stakeholders\n• [2024-04-03] Revisão técnica";

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM(activitiesText);

      // Verifica os resultados
      expect(result.success).toBe(true);
      expect(result.result).toBe(
        "Análise do perfil profissional baseada nas atividades fornecidas."
      );

      // Verifica se a API foi chamada corretamente
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Verifica os argumentos da chamada
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toBe(
        "https://openrouter.ai/api/v1/chat/completions"
      );

      // Verifica o corpo da requisição
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe("meta-llama/llama-3-8b-instruct");

      // Verifica o conteúdo do prompt do sistema
      const systemMessage = requestBody.messages.find(
        (m: any) => m.role === "system"
      );
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain(
        "Você é um executivo de tecnologia experiente"
      );

      // Verifica o conteúdo do prompt do usuário
      expect(requestBody.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: activitiesText
          })
        ])
      );

      // Verifica os cabeçalhos da requisição
      expect(fetchCall[1].headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer sk-or-v1-test-key",
        "HTTP-Referer": "https://bragfy.dev",
        "X-Title": "Bragfy Agent"
      });
    });

    it("deve tratar corretamente erro 401 da API", async () => {
      // Mock de erro 401
      const mockErrorResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: {
            message: "No auth credentials found"
          }
        })
      };

      // Configure o mock para retornar erro 401
      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockErrorResponse as unknown as Response);

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("atividades teste");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain("Falha na análise");
      expect(result.result).toContain("LLM-ERR-401");
    });

    it("deve tratar corretamente erro 500 da API", async () => {
      // Mock de erro 500
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({
          error: {
            message: "Internal server error"
          }
        })
      };

      // Configure o mock para retornar erro 500
      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockErrorResponse as unknown as Response);

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("atividades teste");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain("Falha na análise");
      expect(result.result).toContain("LLM-ERR-500");
    });
  });

  describe("Multiple consecutive calls", () => {
    it("should handle two successful API calls consecutively", async () => {
      // Mock successful responses for two consecutive calls
      const mockResponse1 = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Resultado da primeira análise" } }]
        })
      };

      const mockResponse2 = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Resultado da segunda análise" } }]
        })
      };

      // Set up mock to return different responses on consecutive calls
      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockResponse1 as unknown as Response)
        .mockResolvedValueOnce(mockResponse2 as unknown as Response);

      // First call
      const result1 = await analyzeProfileWithLLM("activity 1");

      // Second call
      const result2 = await analyzeProfileWithLLM("activity 2");

      // Verify both calls were successful
      expect(result1.success).toBe(true);
      expect(result1.result).toBe("Resultado da primeira análise.");

      expect(result2.success).toBe(true);
      expect(result2.result).toBe("Resultado da segunda análise.");

      // Verify fetch was called twice with correct headers both times
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Get the calls to fetch
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;

      // Check both calls have Authorization header with correct API key
      expect(fetchCalls[0][1].headers.Authorization).toBe(
        "Bearer sk-or-v1-test-key"
      );
      expect(fetchCalls[1][1].headers.Authorization).toBe(
        "Bearer sk-or-v1-test-key"
      );

      // Verify request bodies have correct content
      const body1 = JSON.parse(fetchCalls[0][1].body);
      const body2 = JSON.parse(fetchCalls[1][1].body);

      expect(body1.messages.find((m: any) => m.role === "user").content).toBe(
        "activity 1"
      );
      expect(body2.messages.find((m: any) => m.role === "user").content).toBe(
        "activity 2"
      );
    });

    it("should handle 401 unauthorized response", async () => {
      // Mock a 401 error response
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: { message: "Invalid API key" }
        })
      };

      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockResponse as unknown as Response);

      // Call the function
      const result = await analyzeProfileWithLLM("test activity");

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.result).toContain("Falha na análise");
      expect(result.result).toContain("LLM-ERR-401");

      // Verify fetch was called with the correct URL and headers
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer sk-or-v1-test-key",
            "Content-Type": "application/json"
          })
        })
      );
    });
  });

  describe("Sanitização de respostas da análise", () => {
    it("deve sanitizar corretamente respostas com formatação incompleta de Telegram", async () => {
      // Mock da resposta do fetch com formatação de Telegram incorreta
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Texto com *negrito incompleto e _itálico incompleto"
              }
            }
          ]
        })
      };

      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockResponse as unknown as Response);

      // Executa a função
      const result = await analyzeProfileWithLLM("teste sanitização");

      // Verifica que os marcadores incompletos foram corrigidos
      expect(result.success).toBe(true);
      expect(result.result).not.toContain("*negrito incompleto");
      expect(result.result).not.toContain("_itálico incompleto");
      // O texto deve ter sido mantido, removendo apenas os marcadores problemáticos
      expect(result.result).toContain(
        "Texto com negrito incompleto e itálico incompleto"
      );
    });

    it("deve adicionar ponto final a textos que terminam sem pontuação", async () => {
      // Mock da resposta do fetch sem pontuação final
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Análise sem pontuação final" } }]
        })
      };

      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockResponse as unknown as Response);

      // Executa a função
      const result = await analyzeProfileWithLLM("teste sanitização");

      // Verifica que a pontuação final foi adicionada
      expect(result.success).toBe(true);
      expect(result.result).toBe("Análise sem pontuação final.");
    });

    it("deve converter vírgulas finais em pontos finais", async () => {
      // Mock da resposta do fetch com vírgula no final
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Análise com vírgula no final," } }]
        })
      };

      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockResponse as unknown as Response);

      // Executa a função
      const result = await analyzeProfileWithLLM("teste sanitização");

      // Verifica que a vírgula final foi convertida em ponto
      expect(result.success).toBe(true);
      expect(result.result).toBe("Análise com vírgula no final.");
    });

    it("deve corrigir parênteses desbalanceados", async () => {
      // Mock da resposta do fetch com parênteses desbalanceados
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: "Texto com (parêntese aberto e não fechado" }
            }
          ]
        })
      };

      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockResponse as unknown as Response);

      // Executa a função
      const result = await analyzeProfileWithLLM("teste sanitização");

      // Verifica que o parêntese foi fechado
      expect(result.success).toBe(true);
      expect(result.result).toBe("Texto com (parêntese aberto e não fechado.)");
    });

    it("deve remover quebras de linha e espaços extras", async () => {
      // Mock da resposta do fetch com quebras de linha e espaços extras
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Linha 1\nLinha 2\n\nLinha 3    com    espaços"
              }
            }
          ]
        })
      };

      jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(mockResponse as unknown as Response);

      // Executa a função
      const result = await analyzeProfileWithLLM("teste sanitização");

      // Verifica que as quebras de linha e espaços extras foram removidos
      expect(result.success).toBe(true);
      expect(result.result).toBe("Linha 1 Linha 2 Linha 3 com espaços.");
      expect(result.result).not.toContain("\n");
      expect(result.result).not.toMatch(/\s{2,}/);
    });
  });
});
