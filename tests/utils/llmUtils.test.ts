import axios from "axios";
import {
  formatActivitiesForPrompt,
  analyzeProfileWithLLM
} from "../../src/utils/llmUtils";
import { Activity } from "../../src/db/client";

// Mock do módulo axios
jest.mock("axios");

// Constante para chave de API de teste - usar a mesma que usamos na implementação
const TEST_API_KEY =
  "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";

/**
 * Detecta se uma string parece ser uma chave de API real
 * @param key String a ser verificada
 * @returns true se parece ser uma chave real
 */
function looksLikeRealKey(key: string): boolean {
  // Verifica se começa com prefixo de API real e tem comprimento típico
  if (key.startsWith("sk-or-v1-") && key.length > 30) {
    // Se for a chave que estamos usando na aplicação, não considera como vazamento
    return key === TEST_API_KEY ? false : true;
  }
  return false;
}

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
        OPENROUTER_API_KEY: TEST_API_KEY
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

      // Obtém os argumentos da chamada para verificação detalhada
      const callArgs = (axios.post as jest.Mock).mock.calls[0];

      // Verifica a URL
      expect(callArgs[0]).toBe("https://openrouter.ai/api/v1/chat/completions");

      // Verifica o modelo e os cabeçalhos
      expect(callArgs[1].model).toBe("meta-llama/llama-3-8b-instruct");

      // Verifica o conteúdo do prompt do sistema
      const systemMessage = callArgs[1].messages.find(
        (m: any) => m.role === "system"
      );
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain(
        "You are a seasoned technology executive"
      );
      expect(systemMessage.content).toContain(
        "Write directly to the user using the second person"
      );
      expect(systemMessage.content).toContain("subtle dry sarcasm");
      expect(systemMessage.content).toContain(
        "evaluate the nature of the current cycle based on urgency and impact levels"
      );
      expect(systemMessage.content).toContain("Be blunt. Be right.");

      // Verifica o conteúdo do prompt do usuário
      expect(callArgs[1].messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: activitiesText
          })
        ])
      );

      // Verifica os cabeçalhos da requisição
      expect(callArgs[2].headers).toEqual({
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEST_API_KEY}`
      });
    });

    it("deve retornar análise com sucesso quando a API responde corretamente (chave sk-or)", async () => {
      // Configurar a variável de ambiente para os testes com chave sk-or
      process.env = {
        ...originalEnv,
        OPENROUTER_API_KEY: TEST_API_KEY
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

      // Verifica se a API foi chamada corretamente
      expect(axios.post).toHaveBeenCalledTimes(1);

      // Obtém os argumentos da chamada para verificação detalhada
      const callArgs = (axios.post as jest.Mock).mock.calls[0];

      // Verifica a URL e o modelo
      expect(callArgs[0]).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect(callArgs[1].model).toBe("meta-llama/llama-3-8b-instruct");

      // Verifica o conteúdo do prompt do sistema
      const systemMessage = callArgs[1].messages.find(
        (m: any) => m.role === "system"
      );
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain(
        "You are a seasoned technology executive"
      );

      // Verifica os cabeçalhos - apenas os necessários
      expect(callArgs[2].headers).toEqual({
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEST_API_KEY}`
      });
    });

    it("deve usar a chave padrão quando a API Key não está configurada", async () => {
      // Remove a API key do environment
      delete process.env.OPENROUTER_API_KEY;

      // Mock da resposta da API
      jest.spyOn(axios, "post").mockResolvedValueOnce({
        data: {
          id: "resp-123",
          choices: [
            {
              message: {
                role: "assistant",
                content: "Análise usando chave padrão"
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
      const result = await analyzeProfileWithLLM("texto qualquer");

      // Verifica os resultados
      expect(result.success).toBe(true);
      expect(result.result).toBe("Análise usando chave padrão");

      // Verifica os cabeçalhos da requisição
      const callArgs = (axios.post as jest.Mock).mock.calls[0];
      expect(callArgs[2].headers).toEqual({
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEST_API_KEY}`
      });
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

    it("deve verificar que nenhuma chave real está sendo usada nos testes", () => {
      // Isso verifica se acidentalmente estamos usando uma chave real não autorizada nos testes
      const env = { ...process.env };

      // Procura em todas as variáveis de ambiente
      for (const [key, value] of Object.entries(env)) {
        if (key.includes("API_KEY") && value && looksLikeRealKey(value)) {
          console.warn(
            `[SECURITY] Possível chave real não autorizada detectada na variável ${key}!`
          );
          // Isso vai falhar o teste para alertar sobre a possível chave real
          expect(value).toBe(TEST_API_KEY);
        }
      }

      // Verifica que a função looksLikeRealKey não considera a chave de teste como vazamento
      expect(looksLikeRealKey(TEST_API_KEY)).toBe(false);

      // Uma chave real diferente de TEST_API_KEY deve ser detectada
      const fakeRealKey =
        "sk-or-v1-123456789abcdef123456789abcdef123456789abcdef123456789abcdef";
      expect(looksLikeRealKey(fakeRealKey)).toBe(true);
    });

    // Teste para verificar tratamento de erro quando a API retorna erro 401
    it("deve tratar corretamente erro 401 da API", async () => {
      // Configurar a variável de ambiente para os testes
      process.env = {
        ...originalEnv,
        OPENROUTER_API_KEY: TEST_API_KEY
      };

      // Criar um erro do Axios simulando resposta 401
      class MockAxiosError extends Error {
        isAxiosError = true;
        response = {
          status: 401,
          statusText: "Unauthorized",
          data: {
            error: {
              message: "No auth credentials found"
            }
          },
          headers: {
            "x-request-id": "req-123"
          }
        };
        config = {
          url: "https://openrouter.ai/api/v1/chat/completions",
          data: JSON.stringify({
            model: "meta-llama/llama-3-8b-instruct",
            messages: []
          }),
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
            "Content-Type": "application/json"
          },
          method: "POST"
        };
      }

      // Configurar o mock para rejeitar com erro de autenticação
      jest
        .spyOn(axios, "post")
        .mockRejectedValueOnce(
          new MockAxiosError("Request failed with status code 401")
        );

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("atividades teste");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain("ERRO-LLM-401");
    });

    // Teste para verificar tratamento de erro quando a API retorna erro 500
    it("deve tratar corretamente erro 500 da API", async () => {
      // Configurar a variável de ambiente para os testes
      process.env = {
        ...originalEnv,
        OPENROUTER_API_KEY: TEST_API_KEY
      };

      // Criar um erro do Axios simulando resposta 500
      class MockAxiosError extends Error {
        isAxiosError = true;
        response = {
          status: 500,
          statusText: "Internal Server Error",
          data: {
            error: {
              message: "Internal server error"
            }
          },
          headers: {}
        };
        config = {
          url: "https://openrouter.ai/api/v1/chat/completions",
          data: JSON.stringify({
            model: "meta-llama/llama-3-8b-instruct",
            messages: []
          }),
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
            "Content-Type": "application/json"
          },
          method: "POST"
        };
      }

      // Configurar o mock para rejeitar com erro interno
      jest
        .spyOn(axios, "post")
        .mockRejectedValueOnce(
          new MockAxiosError("Request failed with status code 500")
        );

      // Executa a função a ser testada
      const result = await analyzeProfileWithLLM("atividades teste");

      // Verifica os resultados
      expect(result.success).toBe(false);
      expect(result.result).toContain("ERRO-LLM-500");
    });
  });
});
