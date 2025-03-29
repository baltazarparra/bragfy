import { generateBragDocumentPDF } from "../../src/utils/pdfUtils";
import { formatTimestamp } from "../../src/utils/activityUtils";
import { formatUrgencyLabel } from "../../src/utils/activityUtils";
import { formatImpactLabel } from "../../src/utils/activityUtils";

// Mock de dados necessários para o teste
const mockUser = {
  id: 1,
  telegramId: 123456789,
  firstName: "João",
  lastName: "Silva",
  username: "joaosilva"
};

const mockActivities = [
  {
    id: 1,
    content: "Implementei nova funcionalidade",
    date: new Date(),
    urgency: "high",
    impact: "medium"
  },
  {
    id: 2,
    content: "Corrigi bug crítico",
    date: new Date(),
    urgency: "high",
    impact: "high"
  }
];

describe("PDF Utils", () => {
  describe("generateBragDocumentPDF", () => {
    it("deve gerar um PDF com sucesso", async () => {
      // Arrange
      const mockData = {
        user: mockUser,
        activities: mockActivities,
        generatedAt: new Date(),
        period: 7
      };

      // Act
      const result = await generateBragDocumentPDF(mockData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
