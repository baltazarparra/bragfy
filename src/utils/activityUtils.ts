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
