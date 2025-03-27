import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import { handleCallback } from './handlers/callbackDispatcher'

dotenv.config()

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN não encontrado no .env')
}

const bot = new TelegramBot(token, { polling: true })

// Handlers serão implementados aqui
bot.on('callback_query', (query) => handleCallback(bot, query))

console.log('🤖 Bragfy bot iniciado!') 