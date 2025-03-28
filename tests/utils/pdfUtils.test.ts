import { generateBragDocumentPDF } from "../../src/utils/pdfUtils";
import { formatTimestamp } from "../../src/utils/activityUtils";
import { PDFDocument } from "pdf-lib";
import { formatUrgencyLabel } from "../../src/utils/activityUtils";
import { formatImpactLabel } from "../../src/utils/activityUtils";

// Mock do formatTimestamp para ter resultados consistentes
jest.mock("../../src/utils/activityUtils", () => ({
  formatTimestamp: jest.fn().mockReturnValue("01/01/2025 12:00:00")
}));

describe("Utilitários de PDF", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configurar spy para console.error
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("generateBragDocumentPDF", () => {
    it("deve gerar um PDF válido com os dados do usuário e atividades", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva",
        username: "joaozinho"
      };

      const mockActivities = [
        {
          id: 42,
          content: "Implementei uma nova funcionalidade",
          date: new Date("2025-01-01T12:00:00Z"),
          userId: 1
        },
        {
          id: 43,
          content: "Corrigi um bug crítico no sistema",
          date: new Date("2025-01-01T10:00:00Z"),
          userId: 1
        }
      ];

      // Act
      const pdfBuffer = await generateBragDocumentPDF(mockUser, mockActivities);

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verifica que formatTimestamp foi chamado para cada atividade
      expect(formatTimestamp).toHaveBeenCalledTimes(3); // 2 atividades + 1 timestamp de geração
    });

    it("deve lidar com usuários sem sobrenome ou username", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João"
      };

      const mockActivities = [
        {
          id: 42,
          content: "Atividade de teste",
          date: new Date("2025-01-01T12:00:00Z"),
          userId: 1
        }
      ];

      // Act
      const pdfBuffer = await generateBragDocumentPDF(mockUser, mockActivities);

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it("deve lidar com lista vazia de atividades", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva"
      };

      // Act
      const pdfBuffer = await generateBragDocumentPDF(mockUser, []);

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verifica que formatTimestamp foi chamado apenas para o timestamp de geração
      expect(formatTimestamp).toHaveBeenCalledTimes(1);
    });

    it("deve propagar erros ocorridos durante a geração", async () => {
      // Arrange - Mock do PDFDocument.create para lançar erro
      const mockPDFDocument = jest.spyOn(PDFDocument, "create");
      mockPDFDocument.mockImplementationOnce(() => {
        throw new Error("Erro simulado na geração de PDF");
      });

      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João"
      };

      const mockActivities = [
        {
          id: 42,
          content: "Teste",
          date: new Date(),
          userId: 1
        }
      ];

      // Act & Assert
      await expect(
        generateBragDocumentPDF(mockUser, mockActivities)
      ).rejects.toThrow("Falha ao gerar PDF do Brag Document");

      expect(console.error).toHaveBeenCalled();

      // Restaura o mock
      mockPDFDocument.mockRestore();
    });

    it("deve gerar um PDF no estilo Apple com layout moderno e elegante", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva",
        username: "joaozinho"
      };

      const mockActivities = [
        {
          id: 42,
          content: "Implementei uma nova funcionalidade",
          date: new Date("2025-01-01T12:00:00Z"),
          userId: 1
        }
      ];

      // Spy na função PDFDocument para verificar chamadas de método
      const mockDrawText = jest.fn();
      const mockDrawLine = jest.fn();
      const mockDrawRectangle = jest.fn();

      // Mock parcial do PDFDocument para verificar elementos estilísticos
      const spyPage = {
        drawText: mockDrawText,
        drawLine: mockDrawLine,
        drawRectangle: mockDrawRectangle,
        getSize: jest.fn().mockReturnValue({ width: 595.28, height: 841.89 })
      };

      const spyPDFDocument = {
        addPage: jest.fn().mockReturnValue(spyPage),
        embedFont: jest.fn().mockResolvedValue({
          widthOfTextAtSize: jest.fn().mockReturnValue(100)
        }),
        getPages: jest.fn().mockReturnValue([spyPage]),
        getPageCount: jest.fn().mockReturnValue(1),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
      };

      jest
        .spyOn(PDFDocument, "create")
        .mockResolvedValue(spyPDFDocument as any);

      // Act
      const pdfBuffer = await generateBragDocumentPDF(mockUser, mockActivities);

      // Assert
      expect(pdfBuffer).toBeInstanceOf(Buffer);

      // Verifica elementos específicos do estilo Apple

      // 1. Verifica título principal "BRAG DOCUMENT" com estilo grande
      expect(mockDrawText).toHaveBeenCalledWith(
        "BRAG DOCUMENT",
        expect.objectContaining({
          size: expect.any(Number) // Tamanho maior para impacto visual
        })
      );

      // 2. Verifica a presença de retângulos para destaque de atividades
      expect(mockDrawRectangle).toHaveBeenCalled();

      // 3. Verifica a presença do nome da marca no rodapé
      expect(mockDrawText).toHaveBeenCalledWith("Bragfy", expect.any(Object));

      // 4. Verifica a contagem de atividades
      expect(mockDrawText).toHaveBeenCalledWith(
        "1 atividade registrada",
        expect.any(Object)
      );

      // Restaura o mock
      jest.spyOn(PDFDocument, "create").mockRestore();
    });
  });
});
