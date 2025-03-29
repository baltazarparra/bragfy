import { getRandomStickerFor } from "../../src/utils/stickerUtils";

describe("getRandomStickerFor", () => {
  it("retorna ids de stickers válidos para onboarding", () => {
    const onboardingStickers = [
      "CAACAgEAAxkBAAEOLdFn5xfspnjtn2Dj0O4M4DfSUPYUhAACWwcAAr-MkAT_2_Ok8Yw0zjYE",
      "CAACAgEAAxkBAAEOLt1n6AUvXI5H7ZsTcxsacZ_bQYI6AQACWgcAAr-MkAS28TuOYHM0EzYE",
      "CAACAgIAAxkBAAEN1PNntCwsfN50bB74ZPhvIsdVakn7OgACAQEAAladvQoivp8OuMLmNDYE",
      "CAACAgEAAxkBAAEOLuFn6AWOWnZgfFdjV8mqx7pleuHbuwACIQIAAkWd3QXadBWdq01gFTYE",
      "CAACAgIAAxkBAAEOLuNn6AXdbGjpR0XE-Cowzy1rtcl5bgACfgUAAvoLtghVynd3kd-TuDYE"
    ];

    const sticker = getRandomStickerFor("onboarding");
    expect(onboardingStickers).toContain(sticker);
  });

  it("retorna ids de stickers válidos para new_activity", () => {
    const newActivityStickers = [
      "CAACAgIAAxkBAAEN1u9ntNLGPdiveCy_xoajSoDoEAsgLAAC9AADVp29ChFYsPXZ_VVJNgQ",
      "CAACAgEAAxkBAAEOLcln5xeJILga9ba2Y_RACrtXa-JVoAACWAEAAlBLwgNF1HUIrz7N4DYE",
      "CAACAgEAAxkBAAEOLcVn5xd9AAGWi8ZdD1MJteKH4UKg5YEAAigBAAJQS8IDzwMJl2zDu7A2BA",
      "CAACAgEAAxkBAAEOLuln6AZSYJlItkToYAAB8QZbMTt5LOEAAhoCAAJFnd0Ftr-Y7AABFLVYNgQ",
      "CAACAgEAAxkBAAEOLudn6AZPWgUpFiuT8qrZazJ1WqzZ6wACQQIAAkWd3QUAAUvgRzYTNxo2BA",
      "CAACAgIAAxkBAAEOLuVn6AZCtUOFx-Nxys3l8V0P0wdYBwACbgUAAvoLtgh7rzojfTrKDjYE"
    ];

    const sticker = getRandomStickerFor("new_activity");
    expect(newActivityStickers).toContain(sticker);
  });

  it("retorna ids de stickers válidos para brag", () => {
    const bragStickers = [
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
    ];

    const sticker = getRandomStickerFor("brag");
    expect(bragStickers).toContain(sticker);
  });

  it("não repete o mesmo sticker consecutivamente", () => {
    // Solicita vários stickers para o mesmo tipo de interação
    const tipo = "onboarding";
    const primeiroSticker = getRandomStickerFor(tipo);

    // Solicita 5 stickers (deve ser suficiente para verificar que não repete)
    for (let i = 0; i < 5; i++) {
      const proximoSticker = getRandomStickerFor(tipo);
      expect(proximoSticker).not.toBe(primeiroSticker);

      // Após o segundo sticker, é possível que o primeiro seja escolhido novamente
      // então saímos do teste
      if (i === 0) break;
    }
  });

  it("evita repetir o último sticker enviado para cada tipo", () => {
    // Para interações com múltiplos stickers, verifica que não há repetição consecutiva
    const tipos = ["onboarding", "new_activity", "brag"];

    for (const tipo of tipos) {
      const primeiro = getRandomStickerFor(tipo);
      const segundo = getRandomStickerFor(tipo);

      // O segundo sticker não deve ser igual ao primeiro
      expect(segundo).not.toBe(primeiro);
    }
  });
});
