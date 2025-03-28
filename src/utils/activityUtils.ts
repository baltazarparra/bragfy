import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const prisma = new PrismaClient();

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
  urgency: string = "medium",
  impact: string = "medium"
) => {
  try {
    const activity = await prisma.activity.create({
      data: {
        content,
        userId,
        urgency,
        impact,
        confirmed: true
      }
    });

    return activity;
  } catch (error) {
    console.error("Erro ao criar atividade:", error);
    throw new Error("Falha ao criar atividade");
  }
};

/**
 * Formata um timestamp para exibição amigável
 *
 * @param date Data a ser formatada
 * @returns String formatada (DD/MM/YYYY HH:mm:ss)
 */
export const formatTimestamp = (date: Date): string => {
  return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
};

/**
 * Busca atividades de um usuário em um período específico
 *
 * @param userId ID do usuário
 * @param days Número de dias para buscar (contando a partir de hoje)
 * @returns Lista de atividades no período
 */
export const getActivitiesByPeriod = async (userId: number, days: number) => {
  try {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        date: {
          gte: startDate
        },
        confirmed: true
      },
      orderBy: {
        date: "desc"
      }
    });

    return activities;
  } catch (error) {
    console.error(
      `Erro ao buscar atividades para o período de ${days} dias:`,
      error
    );
    throw new Error(
      `Falha ao buscar atividades para o período de ${days} dias`
    );
  }
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
      return "Média";
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
      return "Médio";
  }
};
