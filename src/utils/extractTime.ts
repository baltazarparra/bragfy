import { parse } from "date-fns";
import { TimeExtractionResult } from "../types";

/**
 * Extrai informações de horário de uma mensagem de texto
 * Suporta formatos como "às 10h", "10:00", "10h30", etc.
 *
 * @param message A mensagem original do usuário
 * @param referenceDate Data de referência (normalmente a data atual)
 * @returns Objeto contendo o horário extraído (ou null) e a mensagem limpa
 */
export function extractTime(
  message: string,
  referenceDate: Date = new Date()
): TimeExtractionResult {
  // Definição de padrões de horário com grupos de captura nomeados
  const patterns = [
    // Padrão 1: "às 10h", "as 10h", "às 10h30", "as 10:30"
    {
      // Captura prefixo (às/as) + espaço + horário (com ou sem minutos)
      regex:
        /(?:\s+|^)(?<prefix>às|as)\s+(?<hours>\d{1,2})(?:(?<separator>h|:)(?<minutes>\d{1,2})?)?/i,
      parse: (matches: RegExpMatchArray) => {
        const groups = matches.groups || {};
        const hours = parseInt(groups.hours, 10);

        // Verifica se há minutos, se não houver, usa 0
        let minutes = 0;
        if (groups.minutes) {
          minutes = parseInt(groups.minutes, 10);
        }

        const date = new Date(referenceDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
      }
    },

    // Padrão 2: "10h", "10h30", "10:30" (sem prefixo "às" ou "as")
    {
      regex: /\b(?<hours>\d{1,2})(?<separator>h|:)(?<minutes>\d{1,2})?/i,
      parse: (matches: RegExpMatchArray) => {
        const groups = matches.groups || {};
        const hours = parseInt(groups.hours, 10);

        // Verifica se há minutos, se não houver, usa 0
        let minutes = 0;
        if (groups.minutes) {
          minutes = parseInt(groups.minutes, 10);
        }

        const date = new Date(referenceDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
      }
    }
  ];

  // Percorre cada padrão e tenta encontrar um match
  for (const pattern of patterns) {
    const match = message.match(pattern.regex);

    if (match) {
      // Extrai o horário usando o parser do padrão
      const extractedTime = pattern.parse(match);

      // Remove a expressão completa do horário, incluindo prefixos como "às" ou "as"
      const fullMatch = match[0];

      // Tratamento especial para remover o prefixo corretamente, mantendo a formatação natural
      let cleanMessage = message.replace(fullMatch, "").trim();

      return {
        extractedTime,
        cleanMessage
      };
    }
  }

  // Nenhum padrão de horário encontrado
  return {
    extractedTime: null,
    cleanMessage: message
  };
}
