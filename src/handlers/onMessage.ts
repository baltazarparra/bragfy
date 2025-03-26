import TelegramBot from "node-telegram-bot-api";
import prisma from "../db";
import { extractTime } from "../utils/extractTime";
import { formatTimestamp } from "../utils/formatTimestamp";

/**
 * Manipula mensagens de texto recebidas
 * Extrai informações de horário (se presentes) e salva a atividade
 *
 * @param bot Instância do bot do Telegram
 * @param msg Mensagem recebida
 */
export async function handleMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  // Ignora mensagens que não são texto ou são comandos
  if (!msg.text || msg.text.startsWith("/")) {
    return;
  }

  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    console.warn("Mensagem recebida sem ID de usuário");
    return;
  }

  try {
    // Extrai informações de horário da mensagem
    const messageDate = msg.date ? new Date(msg.date * 1000) : new Date();
    const { extractedTime, cleanMessage } = extractTime(msg.text, messageDate);

    // Define o timestamp efetivo (horário extraído ou data da mensagem)
    const timestamp = extractedTime || messageDate;

    // Salva a atividade no banco de dados
    const activity = await prisma.activity.create({
      data: {
        telegramUserId: userId,
        message: cleanMessage,
        timestamp: timestamp
      }
    });

    // Formata o timestamp usando o utilitário formatTimestamp
    const formattedTime = formatTimestamp(timestamp);

    // Constrói a mensagem de confirmação com formato padronizado
    const confirmationMessage = `✅ Atividade registrada para ${formattedTime}`;

    await bot.sendMessage(chatId, confirmationMessage);
  } catch (error) {
    console.error("Erro ao salvar atividade:", error);
    await bot.sendMessage(
      chatId,
      "❌ Não foi possível registrar sua atividade. Tente novamente."
    );
  }
}
