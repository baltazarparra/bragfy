export type InteractionType =
  | "onboarding"
  | "new_activity"
  | "brag"
  | "welcome_new"
  | "welcome_back";

// Interface para o retorno da função de gerar PDF
export interface BragDocumentPdfResult {
  success: boolean;
  url?: string;
  error?: string;
  buffer?: Buffer;
}

// Mapa entre os tipos legados e os novos tipos
export const INTERACTION_TYPE_MAP: Record<string, InteractionType> = {
  onboarding: "onboarding",
  new_activity: "new_activity",
  brag_document: "brag",
  brag: "brag",
  welcome_new: "onboarding",
  welcome_back: "onboarding"
};

const STICKER_MAP: Record<InteractionType, string[]> = {
  onboarding: [
    "CAACAgIAAxkBAAEOLZtn5w9dD792kbsjCWtu16y2s4POmAAC8AYAApb6EgUsL06hSQK6sjYE",
    "CAACAgIAAxkBAAEN1v1ntNiE0ug9crSsb0VZ-8KeGZprUAAC-wADVp29ClYO2zPbysnmNgQ",
    "CAACAgIAAxkBAAEOLBFn5h_sTUlvj0Im2si9qtIt1ID2mAAC9gADVp29CvfbTiFAPqWKNgQ"
  ],
  new_activity: [
    "CAACAgEAAxkBAAEOLb9n5xcsBq6x0HDSnQK_QmRxL_Su8wACRQEAAlBLwgOfscEasasUCzYE",
    "CAACAgEAAxkBAAEOLb1n5xcg-2hJVFaEnLtIE5WZHKlJzQACHAEAAlBLwgOC5Y2XK4Uu8DYE",
    "CAACAgIAAxkBAAEOLbtn5xcReUM7QPZOW0NOazOnAwGX9wAChwkAAgi3GQLxR2JQbSUnAAE2BA",
    "CAACAgIAAxkBAAEN__5nyrPB4f7vUt-5xYFshzsvdEi9eQAC-gADVp29Ckfe-pdxdHEBNgQ",
    "CAACAgIAAxkBAAEN1u9ntNLGPdiveCy_xoajSoDoEAsgLAAC9AADVp29ChFYsPXZ_VVJNgQ"
  ],
  brag: [
    "CAACAgEAAxkBAAEOLdFn5xfspnjtn2Dj0O4M4DfSUPYUhAACWwcAAr-MkAT_2_Ok8Yw0zjYE",
    "CAACAgEAAxkBAAEOLc9n5xfazqeB8U44g2xlNaUvLaJ-YAACMgEAAv0KkASY50AccbMPRDYE",
    "CAACAgIAAxkBAAEN4Cpnuc56nBLY9563-iemBGmdOyQ-SAACEwADwDZPE6qzh_d_OMqlNgQ",
    "CAACAgIAAxkBAAEOLctn5xeeRT8V23rIQwntBAtLGU1R1AACBwEAAladvQq_tyZhIpO5ojYE",
    "CAACAgEAAxkBAAEOLcln5xeJILga9ba2Y_RACrtXa-JVoAACWAEAAlBLwgNF1HUIrz7N4DYE",
    "CAACAgEAAxkBAAEOLcdn5xeC1zXuu5mI7kXDfvMnOivdbQACJQEAAlBLwgPNNCjjtvh2mzYE",
    "CAACAgEAAxkBAAEOLcVn5xd9AAGWi8ZdD1MJteKH4UKg5YEAAigBAAJQS8IDzwMJl2zDu7A2BA",
    "CAACAgIAAxkBAAEN3jZnuDFrQjM9UFkluMKs_JNY9hgVaAACAwEAAladvQoC5dF4h-X6TzYE",
    "CAACAgQAAxkBAAEOLcFn5xdt4-F8LnxQk0IRwIQNs0j5fQACSwEAAhA1aAABq4cgFB_0m3c2BA"
  ],
  welcome_new: [
    "CAACAgIAAxkBAAEOLZtn5w9dD792kbsjCWtu16y2s4POmAAC8AYAApb6EgUsL06hSQK6sjYE",
    "CAACAgIAAxkBAAEN1v1ntNiE0ug9crSsb0VZ-8KeGZprUAAC-wADVp29ClYO2zPbysnmNgQ",
    "CAACAgIAAxkBAAEOLBFn5h_sTUlvj0Im2si9qtIt1ID2mAAC9gADVp29CvfbTiFAPqWKNgQ"
  ],
  welcome_back: [
    "CAACAgIAAxkBAAEOLZtn5w9dD792kbsjCWtu16y2s4POmAAC8AYAApb6EgUsL06hSQK6sjYE",
    "CAACAgIAAxkBAAEN1v1ntNiE0ug9crSsb0VZ-8KeGZprUAAC-wADVp29ClYO2zPbysnmNgQ",
    "CAACAgIAAxkBAAEOLBFn5h_sTUlvj0Im2si9qtIt1ID2mAAC9gADVp29CvfbTiFAPqWKNgQ"
  ]
};

/**
 * Retorna um sticker aleatório para um tipo de interação
 * @param interactionType Tipo de interação (onboarding, new_activity, brag) ou compatível com legado
 * @returns ID do sticker ou string vazia se nenhum estiver disponível
 */
export function getRandomStickerFor(interactionType: string): string {
  // Converte para o tipo novo se for um tipo legado
  const normalizedType =
    INTERACTION_TYPE_MAP[interactionType] ||
    (interactionType as InteractionType);

  // Verifica se é um tipo válido
  if (!STICKER_MAP[normalizedType as InteractionType]) {
    console.warn(
      `Tipo de interação inválido ou não mapeado: ${interactionType}`
    );
    return "";
  }

  const stickers = STICKER_MAP[normalizedType as InteractionType] || [];
  if (stickers.length === 0) {
    console.warn(
      `Nenhum sticker disponível para a interação "${interactionType}"`
    );
    return "";
  }

  const randomIndex = Math.floor(Math.random() * stickers.length);
  const stickerId = stickers[randomIndex];

  console.log(
    `[STICKER] Enviando sticker para ${interactionType}: ${stickerId}`
  );
  return stickerId;
}

/**
 * Função auxiliar para enviar stickers de forma segura
 * @param bot Instância do bot do Telegram
 * @param chatId ID do chat para enviar o sticker
 * @param interaction Tipo de interação ou stickerId direto
 * @returns Promise<boolean> indicando sucesso ou falha
 */
export async function sendStickerSafely(
  bot: any,
  chatId: number,
  interaction: string
): Promise<boolean> {
  try {
    // Verifica se é um sticker ID direto ou um tipo de interação
    let stickerId: string;

    if (
      interaction.startsWith("CAACAgI") ||
      interaction.startsWith("CAACAgE") ||
      interaction.startsWith("CAACAgQ")
    ) {
      // É um sticker ID direto
      stickerId = interaction;
      console.log(`[STICKER] Usando sticker ID direto: ${stickerId}`);
    } else {
      // É um tipo de interação, busca um sticker aleatório
      stickerId = getRandomStickerFor(interaction);
    }

    if (!stickerId) {
      console.warn(`[STICKER] Nenhum sticker disponível para envio`);
      return false;
    }

    console.log(`[STICKER] Enviando sticker ${stickerId} para chat ${chatId}`);
    await bot.sendSticker(chatId, stickerId);
    console.log(
      `[STICKER] Sticker ${stickerId} enviado com sucesso para chat ${chatId}`
    );
    return true;
  } catch (error) {
    console.error(
      `[STICKER] Erro ao enviar sticker para chat ${chatId}:`,
      error
    );
    return false;
  }
}
