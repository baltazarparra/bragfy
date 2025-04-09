import axios, { AxiosError } from "axios";
import { Activity } from "../db/client";
import { formatTimestamp } from "./activityUtils";

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
    // Verifica se a chave de API está definida
    const apiKey = process.env.OPENROUTER_API_KEY;
    const keyValidation = validateOpenRouterKey(apiKey || "");

    if (!keyValidation.isValid) {
      console.error(`[LLM] ${keyValidation.message}`);
      return {
        success: false,
        result:
          "Desculpe, não foi possível completar a análise do seu perfil. Por favor, tente novamente mais tarde ou entre em contato com o suporte. (ERRO-LLM-100)"
      };
    }

    console.log(
      `[LLM] Usando chave OpenRouter API do tipo: ${keyValidation.keyType}`
    );
    console.log("[LLM] Enviando requisição para a OpenRouter API");
    console.log("[LLM] Using model: meta-llama/llama-3-8b-instruct");

    // Configuração dos cabeçalhos
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };

    // Configuração da requisição
    const response = await axios.post<OpenRouterResponse>(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3-8b-instruct",
        messages: [
          {
            role: "system",
            content:
              "Você é um gestor de tecnologia e produto com vasta experiência. Com base na lista de atividades a seguir, faça uma análise do perfil profissional da pessoa que realizou essas ações. Identifique padrões de comportamento, estilo de trabalho, possíveis pontos de atenção e sugestões de desenvolvimento. Seja objetivo e profissional."
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
        console.error(
          "[LLM] OpenRouter error response body:",
          JSON.stringify(axiosError.response.data, null, 2)
        );
      }

      // Log da request para depuração
      try {
        if (axiosError.config && axiosError.config.data) {
          const requestData = JSON.parse(axiosError.config.data as string);
          console.error(
            "[LLM] Request payload:",
            JSON.stringify(
              {
                model: requestData.model,
                url: axiosError.config.url
              },
              null,
              2
            )
          );
        }
      } catch (parseError) {
        console.error("[LLM] Não foi possível analisar os dados da requisição");
      }

      // Logar headers relacionados à autenticação sem expor tokens
      if (axiosError.response?.headers) {
        const headers = axiosError.response.headers;
        const clerkAuthStatus = headers["x-clerk-auth-status"];
        const clerkAuthReason = headers["x-clerk-auth-reason"];
        const clerkAuthMessage = headers["x-clerk-auth-message"];

        if (clerkAuthStatus || clerkAuthReason || clerkAuthMessage) {
          console.error(
            `[LLM] x-clerk-auth-status: ${clerkAuthStatus || "N/A"}`
          );
          console.error(
            `[LLM] x-clerk-auth-reason: ${clerkAuthReason || "N/A"}`
          );
          console.error(
            `[LLM] x-clerk-auth-message: ${clerkAuthMessage || "N/A"}`
          );
        }
      }
    } else {
      console.error("[LLM] Erro ao chamar OpenRouter API:", error);
    }

    // Código de erro baseado no status da resposta
    let errorCode = "ERRO-LLM-999";
    if (isAxiosError) {
      const axiosError = error as any;
      if (axiosError.response && axiosError.response.status) {
        errorCode = `ERRO-LLM-${axiosError.response.status}`;
      }
    }

    return {
      success: false,
      result: `Desculpe, não foi possível completar a análise do seu perfil. Por favor, tente novamente mais tarde ou entre em contato com o suporte. (${errorCode})`
    };
  }
};
