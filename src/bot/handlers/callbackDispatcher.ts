import TelegramBot from 'node-telegram-bot-api'
import prisma from '../../db'

export async function handleCallback(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery
): Promise<void> {
  const { data, message } = callbackQuery

  if (!data || !message) return

  // Implementação dos handlers virá aqui
  console.log('Callback received:', data)
} 