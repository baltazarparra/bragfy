import { prisma } from "../db/client";
import type { User, UserAnalysis } from "../db/client";
import TelegramBot from "node-telegram-bot-api";
type TelegramUser = TelegramBot.User;

/**
 * Verifica se um usuário existe no banco de dados
 * @param telegramId ID do usuário no Telegram
 * @returns Boolean indicando se o usuário existe
 */
export async function userExists(telegramId: number): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        telegramId
      }
    });
    return !!user;
  } catch (error) {
    console.error(
      `Erro ao verificar existência de usuário ${telegramId}:`,
      error
    );
    return false;
  }
}

/**
 * Busca um usuário pelo ID do Telegram
 * @param telegramId ID do usuário no Telegram
 * @returns Dados do usuário ou null se não encontrado
 */
export async function getUserByTelegramId(
  telegramId: number
): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        telegramId
      }
    });
    return user;
  } catch (error) {
    console.error(`Erro ao buscar usuário ${telegramId}:`, error);
    return null;
  }
}

/**
 * Cria um novo usuário no banco de dados
 * @param user Dados do usuário do Telegram
 * @returns Usuário criado
 */
export async function createUser(user: {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}): Promise<User> {
  try {
    const newUser = await prisma.user.create({
      data: {
        telegramId: user.id,
        firstName: user.first_name,
        lastName: user.last_name || null,
        username: user.username || null
      }
    });
    return newUser;
  } catch (error) {
    console.error(`Erro ao criar usuário ${user.id}:`, error);
    throw error;
  }
}

/**
 * Salva uma análise de perfil para um usuário
 * @param userId ID do usuário no banco de dados
 * @param telegramId ID do usuário no Telegram
 * @param content Conteúdo da análise
 * @returns Análise criada
 */
export async function saveUserAnalysis(
  userId: number,
  telegramId: number,
  content: string
): Promise<UserAnalysis> {
  try {
    // Conta quantas análises o usuário já tem
    const analysisCount = await (prisma as any).userAnalysis.count({
      where: {
        userId
      }
    });

    // Se já tem 3 ou mais, deleta a mais antiga
    if (analysisCount >= 3) {
      const oldestAnalysis = await (prisma as any).userAnalysis.findFirst({
        where: {
          userId
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      if (oldestAnalysis) {
        await (prisma as any).userAnalysis.delete({
          where: {
            id: oldestAnalysis.id
          }
        });
      }
    }

    // Cria a nova análise
    const newAnalysis = await (prisma as any).userAnalysis.create({
      data: {
        userId,
        telegramId,
        content
      }
    });

    console.log(
      `Análise salva com sucesso para usuário ${userId} (ID: ${newAnalysis.id})`
    );
    return newAnalysis;
  } catch (error) {
    console.error(`Erro ao salvar análise para usuário ${userId}:`, error);
    throw error;
  }
}

/**
 * Busca as análises mais recentes de um usuário
 * @param userId ID do usuário no banco de dados
 * @param limit Número máximo de análises para retornar (padrão: 3)
 * @returns Lista de análises ordenadas da mais recente para a mais antiga
 */
export async function getUserAnalyses(
  userId: number,
  limit: number = 3
): Promise<UserAnalysis[]> {
  try {
    const analyses = await (prisma as any).userAnalysis.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    return analyses;
  } catch (error) {
    console.error(`Erro ao buscar análises para usuário ${userId}:`, error);
    return [];
  }
}
