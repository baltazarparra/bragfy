import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fastify from "fastify";
import prisma, { checkDatabaseConnection } from "./db";
import { handleStart } from "./handlers/onStart";
import { handleMessage } from "./handlers/onMessage";
import { handleBrag } from "./handlers/onBrag";

// Carrega as variáveis de ambiente
dotenv.config();

// Valida a presença do token do Telegram
const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.error("❌ BOT_TOKEN não encontrado no arquivo .env");
  process.exit(1);
}

// Inicializa o bot do Telegram com polling (sem webhook)
const bot = new TelegramBot(botToken, { polling: true });

// Inicia um servidor HTTP básico para healthcheck
const server = fastify();

server.get("/health", async () => {
  const dbStatus = await checkDatabaseConnection();
  return {
    status: "online",
    timestamp: new Date().toISOString(),
    database: dbStatus ? "connected" : "disconnected"
  };
});

// Inicia o servidor na porta 3000
const PORT = process.env.PORT || 3000;
server.listen({ port: Number(PORT), host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error("Erro ao iniciar servidor:", err);
    return;
  }
  console.log(`🚀 Servidor iniciado na porta ${PORT}`);
});

// Registra os handlers dos comandos e mensagens
bot.onText(/\/start/, (msg) => handleStart(bot, msg));
bot.onText(/\/brag/, (msg) => handleBrag(bot, msg));
bot.on("message", (msg) => handleMessage(bot, msg));

// Mensagem de inicialização
console.log("🤖 Bragfy Bot iniciado com sucesso!");
console.log("📝 Envie /start no Telegram para começar.");

// Gerenciamento de erros
bot.on("polling_error", (error) => {
  console.error("Erro de polling:", error);
});

// Tratamento de sinais para encerramento gracioso
process.on("SIGINT", async () => {
  console.log("Encerrando bot...");
  bot.stopPolling();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Encerrando bot...");
  bot.stopPolling();
  await prisma.$disconnect();
  process.exit(0);
});
