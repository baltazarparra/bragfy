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

/**
 * Gera múltiplas atividades para testes
 *
 * @param userId ID do usuário
 * @param count Quantidade de atividades a gerar
 * @returns Array de atividades
 */
export function mockMultipleActivities(
  userId: number,
  count: number = 5
): Activity[] {
  return Array(count)
    .fill(null)
    .map(() => mockActivity(userId));
}

// Testes unitários para os próprios mocks
describe("Activity Mocks", () => {
  it("cria uma atividade mock com valores padrão", () => {
    const userId = 123;
    const activity = mockActivity(userId);

    expect(activity).toBeDefined();
    expect(activity.userId).toBe(userId);
    expect(activity.content).toBe("Atividade de teste");
    expect(activity.urgency).toBe("medium");
    expect(activity.impact).toBe("medium");
  });

  it("cria múltiplas atividades mock", () => {
    const userId = 456;
    const count = 3;
    const activities = mockMultipleActivities(userId, count);

    expect(activities).toHaveLength(count);
    activities.forEach((activity) => {
      expect(activity.userId).toBe(userId);
    });
  });
});
