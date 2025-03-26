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
  // Verifica primeiro o padrão "às" ou "as" seguido de horário
  const horaComAsPattern = /\s+(às|as)\s+\d{1,2}h(\d{1,2})?/i;
  const matchHoraComAs = message.match(horaComAsPattern);

  if (matchHoraComAs) {
    // Extrair as informações do horário
    const horaPattern = /(\d{1,2})h(\d{1,2})?/i;
    const horaMatch = matchHoraComAs[0].match(horaPattern);

    if (horaMatch) {
      const hours = parseInt(horaMatch[1], 10);
      const minutes = horaMatch[2] ? parseInt(horaMatch[2], 10) : 0;
      const date = new Date(referenceDate);
      date.setHours(hours, minutes, 0, 0);

      // Remover toda a expressão com o "às" ou "as"
      const cleanMessage = message.replace(matchHoraComAs[0], "").trim();

      return {
        extractedTime: date,
        cleanMessage
      };
    }
  }

  // Outros padrões de horário (sem o "às" ou "as")
  const patterns = [
    // "10h", "10h30"
    {
      regex: /\b(\d{1,2})h(\d{1,2})?/i,
      parse: (matches: RegExpMatchArray) => {
        const hours = parseInt(matches[1], 10);
        const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
        const date = new Date(referenceDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
      }
    },
    // "10:00", "10:30"
    {
      regex: /\b(\d{1,2}):(\d{2})\b/,
      parse: (matches: RegExpMatchArray) => {
        const hours = parseInt(matches[1], 10);
        const minutes = parseInt(matches[2], 10);
        const date = new Date(referenceDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
      }
    }
  ];

  let extractedTime: Date | null = null;
  let cleanMessage = message;

  // Tenta encontrar um padrão de horário na mensagem
  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      extractedTime = pattern.parse(match);
      // Remove o padrão de horário da mensagem
      cleanMessage = message.replace(match[0], "").trim();
      break;
    }
  }

  return {
    extractedTime,
    cleanMessage
  };
}
