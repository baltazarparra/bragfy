import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  formatTimestamp,
  formatUrgencyLabel,
  formatImpactLabel
} from "./activityUtils";
import { BragDocument } from "../types";
import { BragDocumentPdfResult } from "./stickerUtils";

// Definições de tipos para User e Activity caso não estejam disponíveis
interface User {
  id: number;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

interface Activity {
  id: number;
  content: string;
  date: Date;
  urgency?: string;
  impact?: string;
  userId: number;
}

/**
 * Sanitiza o texto removendo caracteres não suportados pela codificação WinAnsi
 * @param text Texto a ser sanitizado
 * @returns Texto sem caracteres Unicode não suportados
 */
function sanitizeText(text: string): string {
  if (!text) return "";

  // Remove emojis e caracteres fora do intervalo básico suportado pela codificação WinAnsi
  // Mantém apenas caracteres ASCII básicos e alguns símbolos comuns
  return text.replace(/[^\x20-\x7F\xA0-\xFF]/g, "");
}

/**
 * Função para geração de PDF utilizando pdf-lib
 */
export async function generateBragDocumentPDF(
  data: BragDocument
): Promise<BragDocumentPdfResult> {
  try {
    // Cria um novo documento PDF
    const pdfDoc = await PDFDocument.create();

    // Adiciona uma página
    let page = pdfDoc.addPage([595.28, 841.89]); // Tamanho A4

    // Obtém as fontes padrão
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Configurações de layout
    const margin = 50;
    const pageWidth = page.getWidth() - 2 * margin;
    const lineHeight = 14;
    let currentY = page.getHeight() - margin;

    // Função helper para adicionar texto
    const addText = (
      text: string,
      font: any,
      size: number,
      indent: number = 0
    ) => {
      const sanitizedText = sanitizeText(text || "");
      page.drawText(sanitizedText, {
        x: margin + indent,
        y: currentY,
        size,
        font,
        color: rgb(0, 0, 0)
      });
      currentY -= lineHeight * (size / 12);
    };

    // Função helper para adicionar texto quebrado em linhas
    const addMultilineText = (
      text: string,
      font: any,
      size: number,
      indent: number = 0,
      maxWidth: number = pageWidth - indent
    ) => {
      const textLines = fitTextToWidth(
        sanitizeText(text || ""),
        font,
        size,
        maxWidth
      );

      for (const line of textLines) {
        if (currentY < margin + 50) {
          // Adiciona nova página se não houver espaço suficiente
          page.drawText("Continua na próxima página...", {
            x: margin,
            y: margin,
            size: 10,
            font: helveticaFont,
            color: rgb(0.5, 0.5, 0.5)
          });

          page = pdfDoc.addPage([595.28, 841.89]);
          currentY = page.getHeight() - margin;
        }

        page.drawText(line, {
          x: margin + indent,
          y: currentY,
          size,
          font,
          color: rgb(0, 0, 0)
        });
        currentY -= lineHeight * (size / 12);
      }

      // Adiciona um pequeno espaço extra após blocos de múltiplas linhas
      currentY -= lineHeight * 0.5;
    };

    // Adiciona cabeçalho
    addText("BRAG DOCUMENT", helveticaBold, 18);
    currentY -= 20;

    // Adiciona informações do usuário
    const userName = `${data.user.firstName}${data.user.lastName ? " " + data.user.lastName : ""}`;
    addText(userName, helveticaBold, 16);

    if (data.user.username) {
      addText(`@${data.user.username}`, helveticaFont, 12);
    }

    currentY -= 10;

    // Adiciona informações do período
    let periodText = "Último dia";
    if (data.period === 7) {
      periodText = "Últimos 7 dias";
    } else if (data.period === 30) {
      periodText = "Últimos 30 dias";
    }

    addText(`Período: ${periodText}`, helveticaFont, 12);
    addText(
      `Gerado em: ${formatTimestamp(new Date(data.generatedAt))}`,
      helveticaFont,
      12
    );

    currentY -= 30;

    // Adiciona uma linha divisória
    page.drawLine({
      start: { x: margin, y: currentY + 10 },
      end: { x: page.getWidth() - margin, y: currentY + 10 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });

    currentY -= 20;

    // Adiciona cabeçalho da lista de atividades
    addText("ATIVIDADES", helveticaBold, 14);
    currentY -= 10;

    // Verifica se há atividades
    if (!data.activities || data.activities.length === 0) {
      addText("Nenhuma atividade registrada neste período.", helveticaFont, 12);
    } else {
      // Itera sobre as atividades
      for (let i = 0; i < data.activities.length; i++) {
        const activity = data.activities[i];

        // Adiciona data da atividade
        const activityDate =
          activity.date instanceof Date
            ? formatTimestamp(activity.date)
            : formatTimestamp(new Date(activity.date));

        addText(activityDate, helveticaBold, 12);

        // Adiciona conteúdo da atividade
        addMultilineText(activity.content, helveticaFont, 12, 10);

        // Adiciona urgência e impacto se disponíveis
        if (activity.urgency) {
          addText(
            `Urgência: ${formatUrgencyLabel(activity.urgency)}`,
            helveticaFont,
            11,
            10
          );
        }

        if (activity.impact) {
          addText(
            `Impacto: ${formatImpactLabel(activity.impact)}`,
            helveticaFont,
            11,
            10
          );
        }

        // Adiciona separador entre atividades, exceto após a última
        if (i < data.activities.length - 1) {
          currentY -= 10;
          page.drawLine({
            start: { x: margin, y: currentY + 5 },
            end: { x: page.getWidth() - margin, y: currentY + 5 },
            thickness: 0.5,
            color: rgb(0.9, 0.9, 0.9)
          });
          currentY -= 15;
        }
      }
    }

    // Adiciona rodapé
    const footerY = margin;
    page.drawText("Bragfy - Seu assistente para gestão de Brag Documents", {
      x: margin,
      y: footerY,
      size: 10,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Serializa o documento para um buffer
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    console.log(`PDF gerado com sucesso: ${buffer.length} bytes`);

    return {
      success: true,
      buffer
    };
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return {
      success: false,
      error: "Não foi possível gerar o PDF"
    };
  }
}

/**
 * Quebra o texto em múltiplas linhas para caber na largura especificada
 */
function fitTextToWidth(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  if (!text) return [""];

  // Implementação simples: quebra por parágrafos
  const paragraphs = text.split("\n");
  const result: string[] = [];

  for (const paragraph of paragraphs) {
    // Para cada parágrafo, verifica se precisa ser quebrado por tamanho
    if (paragraph.length <= 80) {
      // Estimativa simples para texto que cabe na linha
      result.push(paragraph);
    } else {
      // Quebra textos longos em chunks de aproximadamente 80 caracteres
      // Isso é uma aproximação simples; o ideal seria medir o texto com a fonte real
      let remainingText = paragraph;
      while (remainingText.length > 0) {
        const chunkSize = Math.min(80, remainingText.length);
        // Tenta quebrar em espaços para não cortar palavras
        let breakPoint = remainingText.lastIndexOf(" ", chunkSize);
        if (breakPoint <= 0) breakPoint = chunkSize;

        result.push(remainingText.substring(0, breakPoint));
        remainingText = remainingText.substring(breakPoint).trim();
      }
    }
  }

  return result;
}
