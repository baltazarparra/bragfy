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

  // Abordagem simplificada: remover caracteres não suportados, mantendo caracteres básicos
  // Emojis específicos serão adicionados diretamente sem passar por sanitizeText
  return text.replace(/[^\x20-\x7F\xA0-\xFF]/g, "");
}

/**
 * Converte urgência para um texto descritivo
 */
export function urgencyToIcon(urgency?: string): string {
  if (!urgency || typeof urgency !== "string" || urgency.trim() === "") {
    return "—";
  }

  switch (urgency.toLowerCase().trim()) {
    case "high":
      return "🔥";
    case "medium":
      return "🟡";
    case "low":
      return "🧊";
    default:
      return "—";
  }
}

/**
 * Converte urgência para texto para o PDF
 */
export function urgencyToText(urgency?: string): string {
  if (!urgency || typeof urgency !== "string" || urgency.trim() === "") {
    return "—";
  }

  switch (urgency.toLowerCase().trim()) {
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    case "low":
      return "Baixa";
    default:
      return "—";
  }
}

/**
 * Converte impacto para um ícone textual
 */
export function impactToIcon(impact?: string): string {
  if (!impact || typeof impact !== "string" || impact.trim() === "") {
    return "—";
  }

  switch (impact.toLowerCase().trim()) {
    case "high":
      return "🚀";
    case "medium":
      return "📦";
    case "low":
      return "🐾";
    default:
      return "—";
  }
}

/**
 * Converte impacto para texto para o PDF
 */
export function impactToText(impact?: string): string {
  if (!impact || typeof impact !== "string" || impact.trim() === "") {
    return "—";
  }

  switch (impact.toLowerCase().trim()) {
    case "high":
      return "Alto";
    case "medium":
      return "Médio";
    case "low":
      return "Baixo";
    default:
      return "—";
  }
}

/**
 * Formata a data para o formato DD/MM/YYYY
 */
function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
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
      x: number,
      y: number,
      options: any = {}
    ) => {
      const sanitizedText = sanitizeText(text || "");
      page.drawText(sanitizedText, {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
        ...options
      });
      return y - lineHeight * (size / 12);
    };

    // Adiciona cabeçalho
    currentY = addText("BRAG DOCUMENT", helveticaBold, 18, margin, currentY);
    currentY -= 5;

    // Adiciona data de geração no cabeçalho
    const generationDate = formatDate(new Date(data.generatedAt));
    currentY = addText(
      `Gerado em ${generationDate}`,
      helveticaFont,
      10,
      margin,
      currentY
    );
    currentY -= 10;

    // Adiciona informações do usuário
    const userName = `${data.user.firstName}${data.user.lastName ? " " + data.user.lastName : ""}`;
    currentY = addText(userName, helveticaBold, 16, margin, currentY);

    if (data.user.username) {
      currentY = addText(
        `@${data.user.username}`,
        helveticaFont,
        12,
        margin,
        currentY
      );
    }

    currentY -= 10;

    // Adiciona informações do período
    let periodText = "Último dia";
    if (data.period === 7) {
      periodText = "Últimos 7 dias";
    } else if (data.period === 30) {
      periodText = "Últimos 30 dias";
    }

    currentY = addText(
      `Período: ${periodText}`,
      helveticaFont,
      12,
      margin,
      currentY
    );
    currentY -= 15;

    // Configurações da tabela
    const columnWidths = {
      date: 80, // Largura da coluna de data
      activity: pageWidth - 200, // Largura da coluna de atividade
      urgency: 60, // Largura da coluna de urgência
      impact: 60 // Largura da coluna de impacto
    };

    let tableTop = currentY;
    const rowHeight = 20; // Altura mínima da linha
    let tableBottom = tableTop - rowHeight; // Inicializar com altura do cabeçalho

    // Desenha o cabeçalho da tabela
    const headerY = tableTop;

    // Fundo do cabeçalho (cinza claro)
    page.drawRectangle({
      x: margin,
      y: headerY - rowHeight,
      width: pageWidth,
      height: rowHeight,
      color: rgb(0.95, 0.95, 0.95)
    });

    // Texto do cabeçalho
    addText("Data", helveticaBold, 12, margin + 5, headerY - 15);
    addText(
      "Atividade",
      helveticaBold,
      12,
      margin + columnWidths.date + 5,
      headerY - 15
    );
    addText(
      "Urgência",
      helveticaBold,
      12,
      margin + columnWidths.date + columnWidths.activity + 5,
      headerY - 15
    );
    addText(
      "Impacto",
      helveticaBold,
      12,
      margin +
        columnWidths.date +
        columnWidths.activity +
        columnWidths.urgency +
        5,
      headerY - 15
    );

    // Linha horizontal abaixo do cabeçalho
    page.drawLine({
      start: { x: margin, y: headerY - rowHeight },
      end: { x: margin + pageWidth, y: headerY - rowHeight },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });

    // Verifica se há atividades
    if (!data.activities || data.activities.length === 0) {
      const emptyY = headerY - rowHeight - rowHeight / 2;
      addText(
        "Nenhuma atividade registrada neste período.",
        helveticaFont,
        12,
        margin + 5,
        emptyY
      );

      // Atualiza a parte inferior da tabela
      tableBottom = emptyY - rowHeight / 2;
    } else {
      // Função para calcular altura do texto de acordo com tamanho e largura disponível
      const calculateTextHeight = (
        text: string,
        font: any,
        fontSize: number,
        maxWidth: number
      ): number => {
        const avgCharWidth = fontSize * 0.6; // Estimativa da largura média de um caractere
        const charsPerLine = Math.floor(maxWidth / avgCharWidth);
        const lines = Math.ceil(text.length / charsPerLine);
        return lines * lineHeight;
      };

      let currentRowY = headerY - rowHeight;
      let pageNumber = 1;
      const totalPages = Math.ceil(data.activities.length / 25) || 1; // ~25 atividades por página

      // Itera sobre as atividades
      for (let i = 0; i < data.activities.length; i++) {
        const activity = data.activities[i];

        // Calcular altura necessária para o conteúdo
        const activityText = sanitizeText(activity.content || "");
        const textHeight = calculateTextHeight(
          activityText,
          helveticaFont,
          11,
          columnWidths.activity - 10
        );
        const currentRowHeight = Math.max(rowHeight, textHeight);

        // Verifica se precisa de nova página
        if (currentRowY - currentRowHeight < margin + 50) {
          // Desenha linhas verticais da tabela na página atual
          page.drawLine({
            start: { x: margin, y: tableTop },
            end: { x: margin, y: currentRowY },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
          });

          page.drawLine({
            start: { x: margin + columnWidths.date, y: tableTop },
            end: { x: margin + columnWidths.date, y: currentRowY },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
          });

          page.drawLine({
            start: {
              x: margin + columnWidths.date + columnWidths.activity,
              y: tableTop
            },
            end: {
              x: margin + columnWidths.date + columnWidths.activity,
              y: currentRowY
            },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
          });

          page.drawLine({
            start: {
              x:
                margin +
                columnWidths.date +
                columnWidths.activity +
                columnWidths.urgency,
              y: tableTop
            },
            end: {
              x:
                margin +
                columnWidths.date +
                columnWidths.activity +
                columnWidths.urgency,
              y: currentRowY
            },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
          });

          page.drawLine({
            start: { x: margin + pageWidth, y: tableTop },
            end: { x: margin + pageWidth, y: currentRowY },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
          });

          // Linha horizontal inferior da tabela
          page.drawLine({
            start: { x: margin, y: currentRowY },
            end: { x: margin + pageWidth, y: currentRowY },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
          });

          // Adiciona rodapé na página atual
          const footerY = margin;
          addText(
            "Bragfy - Seu assistente para gestão de Brag Documents",
            helveticaFont,
            9,
            margin,
            footerY
          );
          addText(
            `Página ${pageNumber} de ${totalPages}`,
            helveticaFont,
            9,
            margin + pageWidth - 80,
            footerY
          );

          // Cria nova página
          page = pdfDoc.addPage([595.28, 841.89]);
          pageNumber++;

          // Reinicia posição Y
          currentY = page.getHeight() - margin;

          // Adiciona cabeçalho na nova página
          currentY = addText(
            "BRAG DOCUMENT (continuação)",
            helveticaBold,
            18,
            margin,
            currentY
          );
          currentY -= 20;

          // Redesenha o cabeçalho da tabela
          tableTop = currentY;

          // Fundo do cabeçalho
          page.drawRectangle({
            x: margin,
            y: tableTop - rowHeight,
            width: pageWidth,
            height: rowHeight,
            color: rgb(0.95, 0.95, 0.95)
          });

          // Texto do cabeçalho
          addText("Data", helveticaBold, 12, margin + 5, tableTop - 15);
          addText(
            "Atividade",
            helveticaBold,
            12,
            margin + columnWidths.date + 5,
            tableTop - 15
          );
          addText(
            "Urgência",
            helveticaBold,
            12,
            margin + columnWidths.date + columnWidths.activity + 5,
            tableTop - 15
          );
          addText(
            "Impacto",
            helveticaBold,
            12,
            margin +
              columnWidths.date +
              columnWidths.activity +
              columnWidths.urgency +
              5,
            tableTop - 15
          );

          // Linha horizontal abaixo do cabeçalho
          page.drawLine({
            start: { x: margin, y: tableTop - rowHeight },
            end: { x: margin + pageWidth, y: tableTop - rowHeight },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
          });

          currentRowY = tableTop - rowHeight;
        }

        // Desenha a linha para a atividade atual
        const activityDateFormatted = formatDate(activity.date);

        // Preparar pontos de texto
        const dateTextY = currentRowY - rowHeight / 2 - 5;
        const urgencyTextY = dateTextY;
        const impactTextY = dateTextY;

        // Adicionar textos
        addText(
          activityDateFormatted,
          helveticaFont,
          11,
          margin + 5,
          dateTextY
        );

        // Adicionar conteúdo da atividade com wrap
        const lines = fitTextToWidth(
          activityText,
          helveticaFont,
          11,
          columnWidths.activity - 10
        );

        let activityTextY = currentRowY - 15;
        for (const line of lines) {
          addText(
            line,
            helveticaFont,
            11,
            margin + columnWidths.date + 5,
            activityTextY
          );
          activityTextY -= lineHeight;
        }

        // Centrar os ícones nas colunas
        const urgencyTextX =
          margin + columnWidths.date + columnWidths.activity + 5;
        const impactTextX =
          margin +
          columnWidths.date +
          columnWidths.activity +
          columnWidths.urgency +
          5;

        // Usando drawText diretamente para emojis sem sanitizar
        const iconSize = 11;

        // Definir caractere de traço para valores ausentes
        const dashChar = "—";

        // Verificar e desenhar ícone de urgência
        if (activity.urgency) {
          // Usar texto em vez de ícones para garantir compatibilidade com o PDF
          const text = urgencyToText(activity.urgency);

          page.drawText(text, {
            x: urgencyTextX,
            y: urgencyTextY,
            size: iconSize,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          });
        } else {
          page.drawText(dashChar, {
            x: urgencyTextX,
            y: urgencyTextY,
            size: iconSize,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          });
        }

        // Verificar e desenhar ícone de impacto
        if (activity.impact) {
          // Usar texto em vez de ícones para garantir compatibilidade com o PDF
          const text = impactToText(activity.impact);

          page.drawText(text, {
            x: impactTextX,
            y: impactTextY,
            size: iconSize,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          });
        } else {
          page.drawText(dashChar, {
            x: impactTextX,
            y: impactTextY,
            size: iconSize,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          });
        }

        // Linha horizontal entre as linhas da tabela
        page.drawLine({
          start: { x: margin, y: currentRowY - currentRowHeight },
          end: { x: margin + pageWidth, y: currentRowY - currentRowHeight },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8)
        });

        // Atualiza a posição Y para a próxima linha
        currentRowY -= currentRowHeight;
        tableBottom = currentRowY;
      }

      // Desenha linhas verticais da tabela na última página
      page.drawLine({
        start: { x: margin, y: tableTop },
        end: { x: margin, y: tableBottom },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8)
      });

      page.drawLine({
        start: { x: margin + columnWidths.date, y: tableTop },
        end: { x: margin + columnWidths.date, y: tableBottom },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8)
      });

      page.drawLine({
        start: {
          x: margin + columnWidths.date + columnWidths.activity,
          y: tableTop
        },
        end: {
          x: margin + columnWidths.date + columnWidths.activity,
          y: tableBottom
        },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8)
      });

      page.drawLine({
        start: {
          x:
            margin +
            columnWidths.date +
            columnWidths.activity +
            columnWidths.urgency,
          y: tableTop
        },
        end: {
          x:
            margin +
            columnWidths.date +
            columnWidths.activity +
            columnWidths.urgency,
          y: tableBottom
        },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8)
      });

      page.drawLine({
        start: { x: margin + pageWidth, y: tableTop },
        end: { x: margin + pageWidth, y: tableBottom },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8)
      });
    }

    // Adiciona rodapé na última página
    const footerY = margin;
    addText(
      "Bragfy - Seu assistente para gestão de Brag Documents",
      helveticaFont,
      9,
      margin,
      footerY
    );
    const totalPages = Math.ceil((data.activities?.length || 0) / 25) || 1;
    addText(
      `Página ${totalPages} de ${totalPages}`,
      helveticaFont,
      9,
      margin + pageWidth - 80,
      footerY
    );

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
