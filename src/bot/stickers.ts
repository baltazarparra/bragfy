/**
 * Arquivo que contém os IDs dos stickers do Telegram usados nas interações
 */

export const stickers = {
  onboarding: ["STICKER_FILE_ID_1", "STICKER_FILE_ID_2"],
  new_activity: ["STICKER_FILE_ID_3"],
  brag_document: ["STICKER_FILE_ID_4", "STICKER_FILE_ID_5"]
};

/**
 * Retorna um sticker aleatório para uma determinada interação
 * @param interaction - Nome da interação (chave do objeto stickers)
 * @returns Um ID de sticker aleatório ou undefined se não houver stickers disponíveis
 */
export function getRandomSticker(
  interaction: keyof typeof stickers
): string | undefined {
  const availableStickers = stickers[interaction];

  if (!availableStickers || availableStickers.length === 0) {
    return undefined;
  }

  const randomIndex = Math.floor(Math.random() * availableStickers.length);
  return availableStickers[randomIndex];
}
