import { describe, it, expect } from "vitest";
import { extractTime } from "../src/utils/extractTime";

describe("extractTime", () => {
  const referenceDate = new Date("2023-03-15T12:00:00");

  it('deve extrair horário no formato "às 10h"', () => {
    const { extractedTime, cleanMessage } = extractTime(
      "Reunião com equipe às 10h",
      referenceDate
    );

    expect(extractedTime).toBeInstanceOf(Date);
    expect(extractedTime?.getHours()).toBe(10);
    expect(extractedTime?.getMinutes()).toBe(0);
    expect(cleanMessage).toBe("Reunião com equipe");
  });

  it('deve extrair horário no formato "10:30"', () => {
    const { extractedTime, cleanMessage } = extractTime(
      "Chamada com cliente 10:30",
      referenceDate
    );

    expect(extractedTime).toBeInstanceOf(Date);
    expect(extractedTime?.getHours()).toBe(10);
    expect(extractedTime?.getMinutes()).toBe(30);
    expect(cleanMessage).toBe("Chamada com cliente");
  });

  it('deve extrair horário no formato "10h30"', () => {
    const { extractedTime, cleanMessage } = extractTime(
      "Almoço com cliente 10h30",
      referenceDate
    );

    expect(extractedTime).toBeInstanceOf(Date);
    expect(extractedTime?.getHours()).toBe(10);
    expect(extractedTime?.getMinutes()).toBe(30);
    expect(cleanMessage).toBe("Almoço com cliente");
  });

  it("deve retornar null quando não há horário", () => {
    const { extractedTime, cleanMessage } = extractTime(
      "Reunião com equipe",
      referenceDate
    );

    expect(extractedTime).toBeNull();
    expect(cleanMessage).toBe("Reunião com equipe");
  });
});
