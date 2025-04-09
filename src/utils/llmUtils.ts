import axios, { AxiosError } from "axios";
import { Activity } from "../db/client";
import { formatTimestamp } from "./activityUtils";

// Não definimos mais uma chave pública no código
// A chave deve ser definida apenas na variável de ambiente OPENROUTER_API_KEY

/**
 * Interface para resposta da OpenRouter API
 */
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

/**
 * Formata uma lista de atividades para ser enviada à API
 *
 * @param activities Lista de atividades para formatar
 * @returns String formatada com as atividades
 */
export const formatActivitiesForPrompt = (activities: Activity[]): string => {
  return activities
    .map((activity) => {
      // Formata a data para YYYY-MM-DD
      const date = new Date(activity.createdAt);
      const formattedDate = date.toISOString().split("T")[0];

      return `• [${formattedDate}] ${activity.content}`;
    })
    .join("\n");
};

/**
 * Verifica se uma chave de API do OpenRouter é válida
 *
 * @param apiKey Chave de API para verificar
 * @returns Objeto indicando se a chave é válida e o tipo de chave
 */
const validateOpenRouterKey = (
  apiKey: string
): {
  isValid: boolean;
  keyType: "sk-or" | "invalid";
  message?: string;
} => {
  if (!apiKey) {
    return {
      isValid: false,
      keyType: "invalid",
      message: "OPENROUTER_API_KEY não está definida nas variáveis de ambiente"
    };
  }

  // Verifica se é uma chave no formato sk-or-v1-...
  if (apiKey.startsWith("sk-or-")) {
    return { isValid: true, keyType: "sk-or" };
  }

  return {
    isValid: false,
    keyType: "invalid",
    message:
      "Formato de chave OpenRouter API inválido. Use apenas chaves com prefixo sk-or-"
  };
};

/**
 * Envia uma solicitação para a API OpenRouter e retorna a análise do perfil
 *
 * @param activitiesText Texto com as atividades formatadas
 * @returns Resultado da análise ou mensagem de erro
 */
export const analyzeProfileWithLLM = async (
  activitiesText: string
): Promise<{ success: boolean; result: string }> => {
  try {
    // Chave API hardcoded para testes
    const apiKey =
      "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";

    // Configuração dos cabeçalhos com a chave hardcoded
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };

    console.log("[LLM] Enviando requisição para a OpenRouter API");
    console.log("[LLM] Using model: meta-llama/llama-3-8b-instruct");

    // Configuração da requisição
    const response = await axios.post<OpenRouterResponse>(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3-8b-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are a seasoned technology executive. Based on the activity log below, analyze the user's professional behavior. Write directly to the user using the second person (\"you\"). Keep your analysis short, direct, and laced with subtle dry sarcasm — never mocking, never playful. Highlight behavioral patterns, management attitude, potential blind spots, and concrete suggestions for improvement. \n\nAlso, evaluate the nature of the current cycle based on urgency and impact levels reported for each activity. Did the user exaggerate importance? Is everything marked high? Were there low-urgency low-impact tasks only? Draw conclusions about their current pace, mindset, and assertiveness based on these values.\n\nYou're not here to comfort; you're here to give a performance readout. Be blunt. Be right."
          },
          {
            role: "user",
            content: activitiesText
          }
        ]
      },
      { headers }
    );

    console.log("[LLM] Resposta recebida da OpenRouter API");
    console.log(
      `[LLM] Resposta status: ${response.status} ${response.statusText}`
    );

    // Extrai o conteúdo da análise da resposta
    const analysisContent = response.data.choices[0]?.message?.content;

    if (!analysisContent) {
      console.error("[LLM] Resposta inválida da API:", response.data);
      return {
        success: false,
        result:
          "Desculpe, não foi possível completar a análise do seu perfil. Por favor, tente novamente mais tarde ou entre em contato com o suporte. (ERRO-LLM-200)"
      };
    }

    return {
      success: true,
      result: analysisContent
    };
  } catch (error: unknown) {
    // Verificar se o erro é uma instância de AxiosError
    const isAxiosError =
      error instanceof Error &&
      "isAxiosError" in error &&
      (error as any).isAxiosError === true;

    if (isAxiosError) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || "unknown";
      const statusText = axiosError.response?.statusText || "unknown";
      console.error(
        `[LLM] OpenRouter response: status ${status} ${statusText}`
      );

      // Log do corpo da resposta para depuração
      if (axiosError.response?.data) {
        const responseData = axiosError.response.data as any;
        // Adicionar detalhes específicos do erro 401
        if (status === 401) {
          const errorMessage =
            responseData.error?.message || "Erro de autenticação";
          console.error(`[LLM] Erro de autenticação: ${errorMessage}`);
        }

        console.error(
          "[LLM] OpenRouter error response body:",
          JSON.stringify(axiosError.response.data, null, 2)
        );
      }

      // Log da request para depuração
      try {
        if (axiosError.config && axiosError.config.data) {
          const requestData = JSON.parse(axiosError.config.data as string);
          // Log mais detalhado dos headers
          const requestHeaders = axiosError.config.headers || {};
          // Criar uma versão segura dos headers para log (sem mostrar o token completo)
          const safeHeaders: Record<string, string> = {};
          for (const key in requestHeaders) {
            if (
              key.toLowerCase() === "authorization" &&
              typeof requestHeaders[key] === "string"
            ) {
              safeHeaders[key] = "Bearer [REDACTED]";
            } else {
              safeHeaders[key] = String(requestHeaders[key]);
            }
          }

          console.error(
            "[LLM] Request details:",
            JSON.stringify(
              {
                model: requestData.model,
                url: axiosError.config.url,
                headers: safeHeaders,
                method: axiosError.config.method
              },
              null,
              2
            )
          );
        }
      } catch (parseError) {
        console.error(
          "[LLM] Não foi possível analisar os dados da requisição:",
          parseError
        );
      }

      // Código de erro baseado no status da resposta
      let errorCode = "ERRO-LLM-999";
      if (axiosError.response && axiosError.response.status) {
        errorCode = `ERRO-LLM-${axiosError.response.status}`;
      }

      return {
        success: false,
        result: `Desculpe, não foi possível completar a análise do seu perfil. Por favor, tente novamente mais tarde ou entre em contato com o suporte. (${errorCode})`
      };
    } else {
      console.error("[LLM] Erro ao chamar OpenRouter API:", error);
    }

    return {
      success: false,
      result: `Desculpe, não foi possível completar a análise do seu perfil. Por favor, tente novamente mais tarde ou entre em contato com o suporte. (ERRO-LLM-999)`
    };
  }
};
