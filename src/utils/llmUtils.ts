import { Activity } from "../db/client";

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
 * Envia uma solicitação para a API OpenRouter e retorna a análise do perfil
 *
 * @param activitiesText Texto com as atividades formatadas
 * @returns Resultado da análise ou mensagem de erro
 */
export const analyzeProfileWithLLM = async (
  activitiesText: string
): Promise<{ success: boolean; result: string }> => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    console.log("[LLM] Sending request...");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://bragfy.dev",
          "X-Title": "Bragfy Agent"
        },
        body: JSON.stringify({
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
        })
      }
    );

    console.log("[LLM] Response received");

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[LLM] Error ${response.status}: ${response.statusText}`);
      console.error(
        "[LLM] Error details:",
        errorData.error?.message || "Unknown error"
      );

      return {
        success: false,
        result: `Analysis failed. Please try again later. (LLM-ERR-${response.status || "UNKNOWN"})`
      };
    }

    const data = await response.json();
    const analysisContent = data.choices[0]?.message?.content;

    if (!analysisContent) {
      console.error("[LLM] Invalid response from API:", data);
      return {
        success: false,
        result: "Analysis failed. Please try again later. (LLM-ERR)"
      };
    }

    return {
      success: true,
      result: analysisContent
    };
  } catch (error) {
    console.error("[LLM] Error calling OpenRouter API:", error);

    return {
      success: false,
      result: "Analysis failed. Please try again later. (LLM-ERR)"
    };
  }
};
