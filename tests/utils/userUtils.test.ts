import {
  userExists,
  createUser,
  getUserByTelegramId,
} from "../../src/utils/userUtils";
import { prisma } from "../../src/db/client";

// Mock do módulo Prisma
jest.mock("../../src/db/client", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("Utilidades de Usuário", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("userExists", () => {
    it("deve retornar true quando o usuário existe", async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva",
      });

      // Act
      const result = await userExists(123456789);

      // Assert
      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 },
      });
    });

    it("deve retornar false quando o usuário não existe", async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await userExists(123456789);

      // Assert
      expect(result).toBe(false);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 },
      });
    });
  });

  describe("createUser", () => {
    it("deve criar um usuário com base nos dados do Telegram", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva",
        username: "joaosilva",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const telegramUser = {
        id: 123456789,
        first_name: "João",
        last_name: "Silva",
        username: "joaosilva",
        is_bot: false,
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await createUser(telegramUser);

      // Assert
      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          telegramId: 123456789,
          firstName: "João",
          lastName: "Silva",
          username: "joaosilva",
        },
      });
    });

    it("deve lidar com dados parciais do Telegram", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: null,
        username: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const telegramUser = {
        id: 123456789,
        first_name: "João",
        is_bot: false,
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await createUser(telegramUser);

      // Assert
      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          telegramId: 123456789,
          firstName: "João",
          lastName: null,
          username: null,
        },
      });
    });
  });

  describe("getUserByTelegramId", () => {
    it("deve retornar um usuário pelo ID do Telegram", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "João",
        lastName: "Silva",
        username: "joaosilva",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await getUserByTelegramId(123456789);

      // Assert
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 },
      });
    });

    it("deve retornar null quando o usuário não existe", async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getUserByTelegramId(123456789);

      // Assert
      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: 123456789 },
      });
    });
  });
});
