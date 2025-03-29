import { prisma, Activity } from "../db/client";
import { BragActivity } from "../types";

/**
 * Cria uma nova atividade para um usuário
 *
 * @param userId ID do usuário que criou a atividade
 * @param content Conteúdo da atividade
 * @param urgency Nível de urgência (high, medium, low)
 * @param impact Nível de impacto (high, medium, low)
 * @returns A atividade criada
 */
export const createActivity = async (
  userId: number,
  content: string,
  urgency?: string,
  impact?: string
): Promise<Activity> => {
  try {
    const activity = await prisma.activity.create({
      data: {
        userId,
        content,
        urgency,
        impact
      }
    });
    return activity;
  } catch (error) {
    console.error("Erro ao criar atividade:", error);
    throw error;
  }
};

/**
 * Formata um timestamp para exibição amigável
 *
 * @param date Data a ser formatada
 * @returns String formatada (DD/MM/YYYY HH:mm:ss)
 */
export const formatTimestamp = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;

  // Formata a data para DD/MM/YYYY às HH:MM
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/**
 * Busca atividades de um usuário em um período específico
 *
 * @param userId ID do usuário
 * @param days Número de dias para buscar (contando a partir de hoje)
 * @returns Lista de atividades no período
 */
export const getActivitiesByPeriod = async (
  userId: number,
  days: number
): Promise<Activity[]> => {
  // Calcula a data inicial do período (hoje - dias)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Busca atividades no período
  return prisma.activity.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
};

/**
 * Formata o valor de urgência para uma label amigável
 *
 * @param urgency Valor de urgência (high, medium, low)
 * @returns Label formatada
 */
export const formatUrgencyLabel = (urgency: string): string => {
  switch (urgency) {
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    case "low":
      return "Baixa";
    default:
      return urgency;
  }
};

/**
 * Formata o valor de impacto para uma label amigável
 *
 * @param impact Valor de impacto (high, medium, low)
 * @returns Label formatada
 */
export const formatImpactLabel = (impact: string): string => {
  switch (impact) {
    case "high":
      return "Alto";
    case "medium":
      return "Médio";
    case "low":
      return "Baixo";
    default:
      return impact;
  }
};
