import { getRandomStickerFor } from "../../src/utils/stickerUtils";

describe("getRandomStickerFor", () => {
  it("retorna ids de stickers válidos para onboarding", () => {
    const onboardingStickers = [
      "CAACAgIAAxkBAAEOLZtn5w9dD792kbsjCWtu16y2s4POmAAC8AYAApb6EgUsL06hSQK6sjYE",
      "CAACAgIAAxkBAAEN1v1ntNiE0ug9crSsb0VZ-8KeGZprUAAC-wADVp29ClYO2zPbysnmNgQ",
      "CAACAgIAAxkBAAEOLBFn5h_sTUlvj0Im2si9qtIt1ID2mAAC9gADVp29CvfbTiFAPqWKNgQ"
    ];

    const sticker = getRandomStickerFor("onboarding");
    expect(onboardingStickers).toContain(sticker);
  });

  it("retorna ids de stickers válidos para new_activity", () => {
    const newActivityStickers = [
      "CAACAgEAAxkBAAEOLb9n5xcsBq6x0HDSnQK_QmRxL_Su8wACRQEAAlBLwgOfscEasasUCzYE",
      "CAACAgEAAxkBAAEOLb1n5xcg-2hJVFaEnLtIE5WZHKlJzQACHAEAAlBLwgOC5Y2XK4Uu8DYE",
      "CAACAgIAAxkBAAEOLbtn5xcReUM7QPZOW0NOazOnAwGX9wAChwkAAgi3GQLxR2JQbSUnAAE2BA",
      "CAACAgIAAxkBAAEN__5nyrPB4f7vUt-5xYFshzsvdEi9eQAC-gADVp29Ckfe-pdxdHEBNgQ",
      "CAACAgIAAxkBAAEN1u9ntNLGPdiveCy_xoajSoDoEAsgLAAC9AADVp29ChFYsPXZ_VVJNgQ"
    ];

    const sticker = getRandomStickerFor("new_activity");
    expect(newActivityStickers).toContain(sticker);
  });

  it("retorna ids de stickers válidos para brag", () => {
    const bragStickers = [
      "CAACAgEAAxkBAAEOLdFn5xfspnjtn2Dj0O4M4DfSUPYUhAACWwcAAr-MkAT_2_Ok8Yw0zjYE",
      "CAACAgEAAxkBAAEOLc9n5xfazqeB8U44g2xlNaUvLaJ-YAACMgEAAv0KkASY50AccbMPRDYE",
      "CAACAgIAAxkBAAEN4Cpnuc56nBLY9563-iemBGmdOyQ-SAACEwADwDZPE6qzh_d_OMqlNgQ",
      "CAACAgIAAxkBAAEOLctn5xeeRT8V23rIQwntBAtLGU1R1AACBwEAAladvQq_tyZhIpO5ojYE",
      "CAACAgEAAxkBAAEOLcln5xeJILga9ba2Y_RACrtXa-JVoAACWAEAAlBLwgNF1HUIrz7N4DYE",
      "CAACAgEAAxkBAAEOLcdn5xeC1zXuu5mI7kXDfvMnOivdbQACJQEAAlBLwgPNNCjjtvh2mzYE",
      "CAACAgEAAxkBAAEOLcVn5xd9AAGWi8ZdD1MJteKH4UKg5YEAAigBAAJQS8IDzwMJl2zDu7A2BA",
      "CAACAgIAAxkBAAEN3jZnuDFrQjM9UFkluMKs_JNY9hgVaAACAwEAAladvQoC5dF4h-X6TzYE",
      "CAACAgQAAxkBAAEOLcFn5xdt4-F8LnxQk0IRwIQNs0j5fQACSwEAAhA1aAABq4cgFB_0m3c2BA"
    ];

    const sticker = getRandomStickerFor("brag");
    expect(bragStickers).toContain(sticker);
  });
});
