import { prisma } from "../db/client";
import { User as TelegramUser } from "node-telegram-bot-api";

/**
 * Verifica se um usuário já existe no banco de dados
 */
export const userExists = async (telegramId: number): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { telegramId }
  });
  return !!user;
};

/**
 * Cria um novo usuário a partir dos dados do Telegram
 */
export const createUser = async (telegramUser: TelegramUser) => {
  try {
    const user = await prisma.user.create({
      data: {
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null
      }
    });
    return user;
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    throw error;
  }
};

/**
 * Busca um usuário pelo ID do Telegram
 */
export const getUserByTelegramId = async (telegramId: number) => {
  return prisma.user.findUnique({
    where: { telegramId }
  });
};
