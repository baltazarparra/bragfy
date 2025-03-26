import TelegramBot from "node-telegram-bot-api";
import { subDays } from "date-fns";
import prisma from "../db";
import { formatTimestamp } from "../utils/formatTimestamp";
import { generatePdf } from "../utils/pdf";
import { ReportPeriod } from "../types";
import { Prisma } from "@prisma/client";

/**
 * Manipula o comando /brag
 * Permite ao usuário gerar um relatório de atividades
 *
 * @param bot Instância do bot do Telegram
 * @param msg Mensagem recebida
 */
export async function handleBrag(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    console.warn("Comando recebido sem ID de usuário");
    return;
  }

  // Pergunta sobre o período de relatório
  const keyboard = {
    inline_keyboard: [
      [
        { text: "Últimos 30 dias", callback_data: "period:last30days" },
        { text: "Personalizado", callback_data: "period:custom" }
      ]
    ]
  };

  await bot.sendMessage(
    chatId,
    "De qual período você deseja gerar o relatório?",
    { reply_markup: keyboard }
  );

  // Registra handler para a resposta
  bot.on("callback_query", async (callbackQuery) => {
    if (!callbackQuery.data?.startsWith("period:")) {
      return;
    }

    try {
      const period = callbackQuery.data.split(":")[1] as ReportPeriod;
      await generateReport(
        bot,
        callbackQuery.message?.chat.id || chatId,
        userId,
        period
      );

      // Remove os botões após a seleção
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        {
          chat_id: callbackQuery.message?.chat.id,
          message_id: callbackQuery.message?.message_id
        }
      );

      // Responde ao callback query
      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      await bot.sendMessage(
        chatId,
        "❌ Ocorreu um erro ao gerar o relatório. Tente novamente."
      );
    }
  });
}

/**
 * Gera um relatório de atividades para um período específico
 *
 * @param bot Instância do bot do Telegram
 * @param chatId ID do chat para enviar o relatório
 * @param userId ID do usuário do Telegram
 * @param period Período selecionado para o relatório
 */
async function generateReport(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  period: ReportPeriod
): Promise<void> {
  // Mostra mensagem de carregamento
  const loadingMessage = await bot.sendMessage(
    chatId,
    "⏳ Gerando relatório..."
  );

  try {
    let startDate: Date;
    const endDate = new Date();

    if (period === "last30days") {
      startDate = subDays(endDate, 30);
    } else {
      // Para o MVP, o período personalizado também será 30 dias
      // Em versões futuras, isso permitiria ao usuário escolher datas específicas
      startDate = subDays(endDate, 30);
    }

    // Busca atividades no banco de dados
    const activities = await prisma.activity.findMany({
      where: {
        telegramUserId: userId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        timestamp: "asc"
      }
    });

    // Gera um relatório em forma de tabela de texto
    let textReport = `📋 *Relatório de Atividades*\n\n`;

    if (activities.length === 0) {
      textReport += "Nenhuma atividade registrada neste período.";
    } else {
      activities.forEach((activity: (typeof activities)[number]) => {
        const formattedDate = formatTimestamp(activity.timestamp);
        textReport += `\`${formattedDate}\` | ${activity.message}\n`;
      });
    }

    // Adiciona botões para copiar o conteúdo e gerar PDF
    const keyboard = {
      inline_keyboard: [
        [
          { text: "📋 Copiar conteúdo", callback_data: "copy:report" },
          { text: "📄 Gerar PDF", callback_data: "pdf:report" }
        ]
      ]
    };

    // Envia o relatório em texto
    await bot.sendMessage(chatId, textReport, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });

    // Adiciona handler para gerar PDF quando solicitado
    bot.on("callback_query", async (callbackQuery) => {
      if (callbackQuery.data !== "pdf:report") {
        return;
      }

      try {
        // Notifica que está gerando o PDF
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: "Gerando PDF..."
        });

        // Gera o PDF
        const pdfBuffer = await generatePdf({
          title: "Relatório de Atividades",
          activities: activities,
          userName: callbackQuery.from.first_name
        });

        // Envia o arquivo PDF
        await bot.sendDocument(
          chatId,
          pdfBuffer,
          {
            caption: "📄 Seu relatório em PDF"
          },
          {
            filename: `bragfy_report_${Date.now()}.pdf`,
            contentType: "application/pdf"
          }
        );
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        await bot.sendMessage(
          chatId,
          "❌ Não foi possível gerar o PDF. Tente novamente mais tarde."
        );
      }
    });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    await bot.sendMessage(
      chatId,
      "❌ Ocorreu um erro ao gerar o relatório. Tente novamente."
    );
  } finally {
    // Remove a mensagem de carregamento
    await bot.deleteMessage(chatId, loadingMessage.message_id);
  }
}
