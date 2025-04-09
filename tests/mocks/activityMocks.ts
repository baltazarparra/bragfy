import { Activity } from "../../src/db/client";

/**
 * Gera uma atividade simulada para testes
 *
 * @param userId ID do usuário para quem a atividade será criada
 * @returns Uma atividade simulada
 */
export function mockActivity(userId: number): Activity {
  return {
    id: Math.floor(Math.random() * 10000),
    userId,
    content: "Atividade de teste",
    urgency: "medium",
    impact: "medium",
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
