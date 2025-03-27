import { prisma } from "../db/client";
import { User } from ".prisma/client";

/**
 * Cria uma nova atividade para o usuário
 */
export const createActivity = async (userId: number, content: string) => {
  try {
    const activity = await prisma.user
      .findUnique({
        where: { id: userId }
      })
      .then((user: User | null) => {
        if (!user) throw new Error("Usuário não encontrado");

        return prisma.activity.create({
          data: {
            content,
            userId: user.id
          }
        });
      });

    return activity;
  } catch (error) {
    console.error("Erro ao criar atividade:", error);
    throw error;
  }
};

/**
 * Busca atividades de um usuário em um período específico de dias
 * @param userId ID do usuário
 * @param days Número de dias para trás (1 = hoje, 7 = semana, 30 = mês)
 * @returns Array de atividades ordenadas por data decrescente
 */
export const getActivitiesByPeriod = async (userId: number, days: number) => {
  try {
    // Calcula a data de início do período (dias atrás)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1)); // -1 para incluir o dia atual
    startDate.setHours(0, 0, 0, 0); // início do dia

    // Data final (hoje, fim do dia)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // fim do dia

    // Busca atividades no período
    const activities = await prisma.activity.findMany({
      where: {
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: "desc"
      }
    });

    return activities;
  } catch (error) {
    console.error(`Erro ao buscar atividades dos últimos ${days} dias:`, error);
    throw error;
  }
};

/**
 * Formata um timestamp no formato dd/mm/yyyy hh:mm:ss
 */
export const formatTimestamp = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};
