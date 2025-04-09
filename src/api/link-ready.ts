import { Request, Response } from "express";
import { getUserByTelegramId } from "../utils/userUtils";
import TelegramBot from "node-telegram-bot-api";

// Define a interface para o corpo da requisição
export interface LinkReadyRequest {
  userId: number;
  url: string;
}

/**
 * Cria um handler para o endpoint /api/link-ready que notifica o usuário quando
 * seu Brag Document está pronto para visualização
 *
 * @param bot Instância do bot do Telegram para enviar mensagens
 * @returns Um handler para Express.js
 */
export const createLinkReadyHandler = (bot: TelegramBot) => {
  return async (req: Request, res: Response) => {
    try {
      const { userId, url } = req.body as LinkReadyRequest;

      // Valida os parâmetros de entrada
      if (!userId || !url) {
        console.warn(
          `[API] Parâmetros inválidos recebidos: userId=${userId}, url=${url}`
        );
        return res.status(400).json({ error: "Parâmetros inválidos" });
      }

      console.log(
        `[API] Recebida solicitação para notificar userId=${userId} sobre URL=${url}`
      );

      // Busca o usuário pelo ID do Telegram
      const user = await getUserByTelegramId(userId);

      if (!user) {
        console.warn(`[API] Usuário com ID ${userId} não encontrado`);
        return res.status(404).json({ error: "User not found" });
      }

      // Envia mensagem para o usuário via bot
      await bot.sendMessage(
        userId,
        `Seu Brag Document está pronto! ✨\n\n🔗 ${url}`
      );

      console.log(
        `[API] Notificação enviada com sucesso para o usuário ${userId}`
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(`[API] Erro ao processar requisição de link-ready:`, error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  };
};
