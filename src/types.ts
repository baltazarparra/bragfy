// Remover a importação: import { Activity } from "@prisma/client";

// Defina o tipo Activity manualmente
interface Activity {
  id: string;
  telegramUserId: number;
  message: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Período para geração de relatório
 */
export type ReportPeriod = "last30days" | "custom";

/**
 * Opções para geração de PDF
 */
export interface PdfOptions {
  title: string;
  activities: Activity[];
  userName?: string;
}

/**
 * Resultado da extração de horário de uma mensagem
 */
export interface TimeExtractionResult {
  extractedTime: Date | null;
  cleanMessage: string;
}
