import { stickers, getRandomSticker } from "../../src/bot/stickers";

describe("Funções de stickers", () => {
  describe("getRandomSticker", () => {
    // Backup dos stickers originais
    const originalStickers = { ...stickers };

    afterEach(() => {
      // Restaurar os stickers originais após cada teste
      // Restaurar valores originais
      (stickers as any).onboarding = originalStickers.onboarding;
      (stickers as any).new_activity = originalStickers.new_activity;
      (stickers as any).brag_document = originalStickers.brag_document;
    });

    it("deve retornar um sticker válido da lista para uma interação existente", () => {
      // Arrange
      const interactionKey = "onboarding";

      // Act
      const result = getRandomSticker(interactionKey);

      // Assert
      expect(result).toBeDefined();
      expect(stickers[interactionKey]).toContain(result);
    });

    it("deve retornar um sticker aleatório (verificação estatística)", () => {
      // Este teste verifica estatisticamente se os stickers são escolhidos aleatoriamente
      // Mock de uma lista com múltiplos stickers
      const mockStickers = [
        "sticker1",
        "sticker2",
        "sticker3",
        "sticker4",
        "sticker5"
      ];

      // Substituir o array de stickers diretamente
      (stickers as any).onboarding = mockStickers;

      // Executa a função múltiplas vezes para verificar distribuição
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        results.add(getRandomSticker("onboarding"));
      }

      // Se pelo menos 3 stickers diferentes foram selecionados, a aleatoriedade está funcionando
      // (Estatisticamente, é extremamente improvável que em 100 escolhas aleatórias
      // apenas 1 ou 2 valores de uma lista de 5 sejam selecionados)
      expect(results.size).toBeGreaterThan(2);
    });

    it("deve retornar undefined quando a interação não existe", () => {
      // Act & Assert
      // @ts-ignore - testando com uma chave inválida
      expect(getRandomSticker("interacao_inexistente")).toBeUndefined();
    });

    it("deve retornar undefined quando o array de stickers está vazio", () => {
      // Substituir o array de stickers por um array vazio
      (stickers as any).onboarding = [];

      // Act & Assert
      expect(getRandomSticker("onboarding")).toBeUndefined();
    });
  });
});
