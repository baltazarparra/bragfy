import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata um timestamp para o formato padrão do Bragfy
 *
 * @param date A data a ser formatada
 * @returns String formatada como "DD/MM/YY HH:MM:SS"
 */
export function formatTimestamp(date: Date): string {
  return format(date, "dd/MM/yy HH:mm:ss", { locale: ptBR });
}

/**
 * Formata uma data para exibição em relatórios
 *
 * @param date A data a ser formatada
 * @returns String formatada como "DD de MMMM de YYYY"
 */
export function formatReportDate(date: Date): string {
  return format(date, "'dia' dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Formata uma data para exibição no cabeçalho de relatórios
 *
 * @param startDate Data de início do período
 * @param endDate Data de fim do período
 * @returns String formatada para exibição do período
 */
export function formatReportPeriod(startDate: Date, endDate: Date): string {
  if (
    startDate.getDate() === endDate.getDate() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    // Mesmo dia
    return formatReportDate(startDate);
  } else {
    // Período
    return `${format(startDate, "dd/MM/yyyy", { locale: ptBR })} até ${format(
      endDate,
      "dd/MM/yyyy",
      { locale: ptBR }
    )}`;
  }
}
