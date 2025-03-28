import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import {
  formatTimestamp,
  formatUrgencyLabel,
  formatImpactLabel
} from "./activityUtils";

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
 * Gera um PDF do Brag Document no estilo minimalista Apple
 * @param user Usuário com as informações de perfil
 * @param activities Lista de atividades para incluir no documento
 * @returns Buffer contendo o PDF gerado
 */
export const generateBragDocumentPDF = async (
  user: User,
  activities: Activity[]
): Promise<Buffer> => {
  try {
    // Cria um novo documento PDF
    const pdfDoc = await PDFDocument.create();

    // Fontes para o documento
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(
      StandardFonts.HelveticaOblique
    );

    // Configurações de layout
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 60; // Aumentando margem para mais espaço em branco (estilo Apple)

    // Cores - Ajustadas para estilo Apple mais moderno
    const textColor = rgb(0.1, 0.1, 0.1); // Preto menos intenso
    const accentColor = rgb(0, 0.45, 0.9); // Azul Apple
    const lightGray = rgb(0.95, 0.95, 0.95); // Mais sutil
    const darkGray = rgb(0.4, 0.4, 0.4); // Cinza médio para melhor legibilidade

    // Estilo de tipografia refinada e hierarquia clara
    const titleSize = 28; // Maior para maior impacto visual
    const subtitleSize = 20; // Nova categoria
    const normalSize = 11; // Ligeiramente menor para elegância
    const smallSize = 9; // Informações secundárias

    // Posição inicial para escrita
    let y = height - margin;
    const contentWidth = width - 2 * margin;

    // Título principal - Design simplificado
    page.drawText(sanitizeText("BRAG DOCUMENT"), {
      x: margin,
      y,
      size: titleSize,
      font: helveticaBold,
      color: textColor
    });
    y -= 50; // Maior espaçamento após título

    // Linha separadora com gradiente sutil
    const lineWidth = width - 2 * margin;
    for (let i = 0; i < lineWidth; i += 2) {
      const opacity = Math.sin((i / lineWidth) * Math.PI) * 0.5 + 0.5;
      page.drawLine({
        start: { x: margin + i, y },
        end: { x: margin + i + 1, y },
        thickness: 1,
        color: rgb(0.9 * opacity, 0.9 * opacity, 0.9 * opacity)
      });
    }
    y -= 40; // Mais espaço após o separador

    // Informações do usuário - Nome com destaque
    const userName = sanitizeText(
      `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    );
    page.drawText(userName, {
      x: margin,
      y,
      size: subtitleSize,
      font: helveticaBold,
      color: textColor
    });
    y -= 28;

    // Username (se existir) com tratamento especial
    if (user.username) {
      page.drawText(sanitizeText(`@${user.username}`), {
        x: margin,
        y,
        size: normalSize,
        font: helveticaOblique,
        color: accentColor // Destaque sutil com cor da marca
      });
      y -= 25;
    } else {
      y -= 15; // Menos espaço se não houver username
    }

    // ID do usuário
    page.drawText(sanitizeText(`ID: ${user.telegramId}`), {
      x: margin,
      y,
      size: smallSize,
      font: helveticaFont,
      color: darkGray
    });
    y -= 50; // Maior espaçamento antes da próxima seção

    // Marca d'água sutil no fundo (opcional)
    page.drawText(sanitizeText("BRAGFY"), {
      x: width - 2 * margin,
      y: height / 2,
      size: 100,
      font: helveticaBold,
      color: rgb(0.98, 0.98, 0.98), // Quase invisível
      rotate: degrees(-90)
    });

    // Título da seção de atividades com maior destaque
    page.drawText(sanitizeText("ATIVIDADES"), {
      x: margin,
      y,
      size: subtitleSize - 2, // Ligeiramente menor que o nome do usuário
      font: helveticaBold,
      color: textColor
    });
    y -= 30;

    // Texto informativo sobre o período
    const periodoInfo = sanitizeText(
      `${activities.length} ${activities.length === 1 ? "atividade registrada" : "atividades registradas"}`
    );
    page.drawText(periodoInfo, {
      x: margin,
      y,
      size: smallSize,
      font: helveticaOblique,
      color: darkGray
    });
    y -= 25;

    // Lista de atividades com layout aprimorado
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      // Adiciona retângulo sutil para destacar cada atividade
      page.drawRectangle({
        x: margin - 10,
        y: y - 5,
        width: width - 2 * margin + 20,
        height: 2,
        color: lightGray
      });

      const timestamp = sanitizeText(formatTimestamp(activity.date));

      // Data/hora da atividade
      page.drawText(timestamp, {
        x: margin,
        y,
        size: smallSize,
        font: helveticaOblique,
        color: darkGray
      });
      y -= 22;

      // Sanitiza o conteúdo da atividade antes de dividi-lo
      const sanitizedContent = sanitizeText(activity.content);
      console.log(`Conteúdo sanitizado: "${sanitizedContent}"`);

      // Conteúdo da atividade - Maior destaque para o conteúdo principal
      const contentLines = fitTextToWidth(
        sanitizedContent,
        helveticaFont,
        normalSize,
        contentWidth
      );

      for (const line of contentLines) {
        page.drawText(line, {
          x: margin + 5, // Indentação sutil
          y,
          size: normalSize,
          font: helveticaFont,
          color: textColor
        });
        y -= 16;
      }

      // Adiciona informações de urgência e impacto
      y -= 5; // Pequeno espaço adicional

      // Urgência, se disponível
      if (activity.urgency) {
        const urgencyLabel = sanitizeText(
          `• Urgência: ${formatUrgencyLabel(activity.urgency)}`
        );
        page.drawText(urgencyLabel, {
          x: margin + 10, // Maior indentação para mostrar hierarquia
          y,
          size: smallSize + 1,
          font: helveticaFont,
          color: darkGray
        });
        y -= 16;
      }

      // Impacto, se disponível
      if (activity.impact) {
        const impactLabel = sanitizeText(
          `• Impacto: ${formatImpactLabel(activity.impact)}`
        );
        page.drawText(impactLabel, {
          x: margin + 10, // Maior indentação para mostrar hierarquia
          y,
          size: smallSize + 1,
          font: helveticaFont,
          color: darkGray
        });
        y -= 16;
      }

      // Maior espaçamento entre atividades para clareza visual
      y -= 30;

      // Verifica se precisa de uma nova página
      if (y < 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }
    }

    // Rodapé com refinamentos estéticos
    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

    // Linha fina na parte inferior
    lastPage.drawLine({
      start: { x: margin, y: margin / 2 + 15 },
      end: { x: width - margin, y: margin / 2 + 15 },
      thickness: 0.5,
      color: lightGray
    });

    // Timestamp de geração
    const generationText = sanitizeText(
      `Gerado em ${formatTimestamp(new Date())}`
    );
    lastPage.drawText(generationText, {
      x: margin,
      y: margin / 2,
      size: smallSize,
      font: helveticaOblique,
      color: darkGray
    });

    // Logo ou texto da marca à direita
    const brandText = sanitizeText("Bragfy");
    lastPage.drawText(brandText, {
      x:
        width - margin - helveticaBold.widthOfTextAtSize(brandText, normalSize),
      y: margin / 2,
      size: normalSize,
      font: helveticaBold,
      color: accentColor
    });

    // Serializa o PDF para bytes
    const pdfBytes = await pdfDoc.save();

    // Converte para Buffer e retorna
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw new Error("Falha ao gerar PDF do Brag Document");
  }
};

/**
 * Função auxiliar para quebrar texto longo em múltiplas linhas
 */
function fitTextToWidth(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
