export type InteractionType =
  | "onboarding"
  | "new_activity"
  | "brag"
  | "welcome_new"
  | "welcome_back"
  | "analysis";

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
  welcome_back: "onboarding",
  analysis: "analysis"
};

// Armazena o último sticker enviado para cada tipo de interação para evitar repetição
const lastSentSticker: Record<InteractionType, string> = {
  onboarding: "",
  new_activity: "",
  brag: "",
  welcome_new: "",
  welcome_back: "",
  analysis: ""
};

const STICKER_MAP: Record<InteractionType, string[]> = {
  onboarding: [
    "CAACAgEAAxkBAAEOLdFn5xfspnjtn2Dj0O4M4DfSUPYUhAACWwcAAr-MkAT_2_Ok8Yw0zjYE",
    "CAACAgEAAxkBAAEOLt1n6AUvXI5H7ZsTcxsacZ_bQYI6AQACWgcAAr-MkAS28TuOYHM0EzYE",
    "CAACAgIAAxkBAAEN1PNntCwsfN50bB74ZPhvIsdVakn7OgACAQEAAladvQoivp8OuMLmNDYE",
    "CAACAgEAAxkBAAEOLuFn6AWOWnZgfFdjV8mqx7pleuHbuwACIQIAAkWd3QXadBWdq01gFTYE",
    "CAACAgIAAxkBAAEOLuNn6AXdbGjpR0XE-Cowzy1rtcl5bgACfgUAAvoLtghVynd3kd-TuDYE"
  ],
  new_activity: [
    "CAACAgIAAxkBAAEN1u9ntNLGPdiveCy_xoajSoDoEAsgLAAC9AADVp29ChFYsPXZ_VVJNgQ",
    "CAACAgEAAxkBAAEOLcln5xeJILga9ba2Y_RACrtXa-JVoAACWAEAAlBLwgNF1HUIrz7N4DYE",
    "CAACAgEAAxkBAAEOLcVn5xd9AAGWi8ZdD1MJteKH4UKg5YEAAigBAAJQS8IDzwMJl2zDu7A2BA",
    "CAACAgEAAxkBAAEOLuln6AZSYJlItkToYAAB8QZbMTt5LOEAAhoCAAJFnd0Ftr-Y7AABFLVYNgQ",
    "CAACAgEAAxkBAAEOLudn6AZPWgUpFiuT8qrZazJ1WqzZ6wACQQIAAkWd3QUAAUvgRzYTNxo2BA",
    "CAACAgIAAxkBAAEOLuVn6AZCtUOFx-Nxys3l8V0P0wdYBwACbgUAAvoLtgh7rzojfTrKDjYE"
  ],
  brag: [
    "CAACAgIAAxkBAAEOLwln6AdWxbjgTaB1NWS8KISU-0PK2AACfgcAAlOx9wMss8IS7z5EBDYE",
    "CAACAgEAAxkBAAEOLwNn6AdN37DATUq1P-j6W7vaeiHMNAAC5AIAAttS9wGxEpTjmDP13jYE",
    "CAACAgIAAxkBAAEOLv9n6Ac9NyrgHB84bulCv-bV3ppI8gACwAEAAzigCgfhO93Ur_AiNgQ",
    "CAACAgEAAxkBAAEOLv1n6Acn6Jn2kkW93FdfSr2w8nw9cwACNQADBE-nFiYkaCi0OBvBNgQ",
    "CAACAgIAAxkBAAEOLbtn5xcReUM7QPZOW0NOazOnAwGX9wAChwkAAgi3GQLxR2JQbSUnAAE2BA",
    "CAACAgQAAxkBAAEOLcFn5xdt4-F8LnxQk0IRwIQNs0j5fQACSwEAAhA1aAABq4cgFB_0m3c2BA",
    "CAACAgIAAxkBAAEN3jZnuDFrQjM9UFkluMKs_JNY9hgVaAACAwEAAladvQoC5dF4h-X6TzYE",
    "CAACAgEAAxkBAAEOLdFn5xfspnjtn2Dj0O4M4DfSUPYUhAACWwcAAr-MkAT_2_Ok8Yw0zjYE",
    "CAACAgIAAxkBAAEOLctn5xeeRT8V23rIQwntBAtLGU1R1AACBwEAAladvQq_tyZhIpO5ojYE",
    "CAACAgEAAxkBAAEOLcdn5xeC1zXuu5mI7kXDfvMnOivdbQACJQEAAlBLwgPNNCjjtvh2mzYE"
  ],
  welcome_new: [
    "CAACAgEAAxkBAAEOLdFn5xfspnjtn2Dj0O4M4DfSUPYUhAACWwcAAr-MkAT_2_Ok8Yw0zjYE",
    "CAACAgEAAxkBAAEOLt1n6AUvXI5H7ZsTcxsacZ_bQYI6AQACWgcAAr-MkAS28TuOYHM0EzYE",
    "CAACAgIAAxkBAAEN1PNntCwsfN50bB74ZPhvIsdVakn7OgACAQEAAladvQoivp8OuMLmNDYE",
    "CAACAgEAAxkBAAEOLuFn6AWOWnZgfFdjV8mqx7pleuHbuwACIQIAAkWd3QXadBWdq01gFTYE",
    "CAACAgIAAxkBAAEOLuNn6AXdbGjpR0XE-Cowzy1rtcl5bgACfgUAAvoLtghVynd3kd-TuDYE"
  ],
  welcome_back: [
    "CAACAgEAAxkBAAEOLdFn5xfspnjtn2Dj0O4M4DfSUPYUhAACWwcAAr-MkAT_2_Ok8Yw0zjYE",
    "CAACAgEAAxkBAAEOLt1n6AUvXI5H7ZsTcxsacZ_bQYI6AQACWgcAAr-MkAS28TuOYHM0EzYE",
    "CAACAgIAAxkBAAEN1PNntCwsfN50bB74ZPhvIsdVakn7OgACAQEAAladvQoivp8OuMLmNDYE",
    "CAACAgEAAxkBAAEOLuFn6AWOWnZgfFdjV8mqx7pleuHbuwACIQIAAkWd3QXadBWdq01gFTYE",
    "CAACAgIAAxkBAAEOLuNn6AXdbGjpR0XE-Cowzy1rtcl5bgACfgUAAvoLtghVynd3kd-TuDYE"
  ],
  analysis: [
    "CAACAgIAAxkBAAEOLwln6AdWxbjgTaB1NWS8KISU-0PK2AACfgcAAlOx9wMss8IS7z5EBDYE",
    "CAACAgEAAxkBAAEOLwNn6AdN37DATUq1P-j6W7vaeiHMNAAC5AIAAttS9wGxEpTjmDP13jYE",
    "CAACAgIAAxkBAAEOLv9n6Ac9NyrgHB84bulCv-bV3ppI8gACwAEAAzigCgfhO93Ur_AiNgQ"
  ]
};

/**
 * Retorna um sticker aleatório para um tipo de interação, evitando repetição consecutiva
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

  // Guarda o último sticker enviado para este tipo de interação
  const lastSticker = lastSentSticker[normalizedType as InteractionType];

  // Filtra os stickers para evitar repetir o último, se houver mais de um sticker disponível
  let availableStickers = stickers;
  if (lastSticker && stickers.length > 1) {
    availableStickers = stickers.filter((sticker) => sticker !== lastSticker);
  }

  // Seleciona um sticker aleatório entre os disponíveis
  const randomIndex = Math.floor(Math.random() * availableStickers.length);
  const stickerId = availableStickers[randomIndex];

  // Atualiza o último sticker enviado para este tipo
  lastSentSticker[normalizedType as InteractionType] = stickerId;

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
