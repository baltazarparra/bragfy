import axios from "axios";
import {
  formatActivitiesForPrompt,
  analyzeProfileWithLLM
} from "../../src/utils/llmUtils";
import { Activity } from "../../src/db/client";

// Mock do módulo axios
jest.mock("axios");

describe("llmUtils", () => {
  // Limpar todos os mocks antes de cada teste
  beforeEach(() => {
    jest.clearAllMocks();
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
    // Configurações originais do environment
    const originalEnv = process.env;

    beforeEach(() => {
      // Limpar os mocks do axios
      jest.spyOn(axios, "post").mockClear();
    });

    afterEach(() => {
      // Restaurar as configurações originais
      process.env = originalEnv;
    });

    it("deve retornar análise com sucesso quando a API responde corretamente (chave JWT)", async () => {
      // Configurar a variável de ambiente para os testes com chave JWT
      process.env = {
        ...originalEnv,
        OPENROUTER_API_KEY:
          "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"
      };

      // Mock da resposta da API usando jest.spyOn
      jest.spyOn(axios, "post").mockResolvedValueOnce({
        data: {
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
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { url: "https://openrouter.ai/api/v1/chat/completions" }
      });

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
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          model: "meta-llama/llama-3-8b-instruct",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({
              role: "user",
              content: activitiesText
            })
          ])
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization:
              "Bearer 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",
            "Content-Type": "application/json"
          })
        })
      );
    });

    it("deve retornar análise com sucesso quando a API responde corretamente (chave sk-or)", async () => {
      // Configurar a variável de ambiente para os testes com chave sk-or
      process.env = {
        ...originalEnv,
        OPENROUTER_API_KEY:
          "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"
      };

      // Mock da resposta da API
      jest.spyOn(axios, "post").mockResolvedValueOnce({
        data: {
          id: "resp-123",
          choices: [
            {
              message: {
                role: "assistant",
                content: "Análise de perfil usando chave sk-or"
              }
            }
          ]
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { url: "https://openrouter.ai/api/v1/chat/completions" }
      });

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("atividades de teste");

      // Verifica os resultados
      expect(result.success).toBe(true);
      expect(result.result).toBe("Análise de perfil usando chave sk-or");

      // Verifica se a API foi chamada com o cabeçalho correto
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          model: "meta-llama/llama-3-8b-instruct"
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization:
              "Bearer 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",
            "Content-Type": "application/json"
          })
        })
      );
    });

    it("deve retornar erro quando a API Key não está configurada", async () => {
      // Remove a API key do environment
      delete process.env.OPENROUTER_API_KEY;

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("texto qualquer");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain(
        "Desculpe, não foi possível completar a análise do seu perfil"
      );
      expect(result.result).toContain("ERRO-LLM-100");

      // Verifica que a API não foi chamada
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("deve retornar erro quando a API Key tem formato inválido", async () => {
      // Configura uma API key com formato inválido
      process.env.OPENROUTER_API_KEY = "chave-invalida-sem-pontos";

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("texto qualquer");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain(
        "Desculpe, não foi possível completar a análise do seu perfil"
      );
      expect(result.result).toContain("ERRO-LLM-100");

      // Verifica que a API não foi chamada
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("deve retornar erro quando a API retorna resposta inválida", async () => {
      // Configura uma API key com formato válido para teste
      process.env.OPENROUTER_API_KEY =
        "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";

      // Mock da resposta inválida da API (sem choices)
      jest.spyOn(axios, "post").mockResolvedValueOnce({
        data: {
          id: "resp-456",
          choices: []
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { url: "https://openrouter.ai/api/v1/chat/completions" }
      });

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("texto qualquer");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain(
        "Desculpe, não foi possível completar a análise do seu perfil"
      );
      expect(result.result).toContain("ERRO-LLM-200");
    });

    it("deve lidar com erros da API (401 Unauthorized)", async () => {
      // Configura uma API key com formato válido para teste
      process.env.OPENROUTER_API_KEY =
        "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";

      // Cria um erro de Axios com a estrutura correta
      class MockAxiosError extends Error {
        isAxiosError = true;
        response = {
          status: 401,
          statusText: "Unauthorized",
          headers: {
            "x-clerk-auth-status": "signed-out",
            "x-clerk-auth-reason": "token-invalid",
            "x-clerk-auth-message":
              "Invalid JWT form. A JWT consists of three parts separated by dots."
          },
          data: {
            error: "Unauthorized",
            message: "Invalid authentication token"
          }
        };
      }

      // Configura o mock para simular um erro da API
      jest.spyOn(axios, "post").mockRejectedValueOnce(new MockAxiosError());

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("texto qualquer");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain(
        "Desculpe, não foi possível completar a análise do seu perfil"
      );
      expect(result.result).toContain("ERRO-LLM-401");
    });

    it("deve lidar com erros da API (400 Bad Request)", async () => {
      // Configura uma API key com formato válido para teste
      process.env.OPENROUTER_API_KEY =
        "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";

      // Cria um erro de Axios com a estrutura correta
      class MockAxiosError extends Error {
        isAxiosError = true;
        response = {
          status: 400,
          statusText: "Bad Request",
          headers: {},
          data: {
            error: "Bad Request",
            message: "Invalid authorization header format"
          }
        };
      }

      // Configura o mock para simular um erro 400 da API
      jest.spyOn(axios, "post").mockRejectedValueOnce(new MockAxiosError());

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("texto qualquer");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain(
        "Desculpe, não foi possível completar a análise do seu perfil"
      );
      expect(result.result).toContain("ERRO-LLM-400");
    });
  });
});
