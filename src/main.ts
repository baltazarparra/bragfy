import dotenv from "dotenv";
import { initBot } from "./bot";
import { prisma } from "./db/client";

// Carrega variáveis de ambiente
dotenv.config();

// Verifica se o token do bot está configurado
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error(
    "ERRO: Token do bot do Telegram não encontrado! Certifique-se de configurar TELEGRAM_BOT_TOKEN no arquivo .env"
  );
  process.exit(1);
}

// Função principal de inicialização
const main = async () => {
  try {
    // Verifica conexão com o banco de dados
    await prisma.$connect();
    console.log("Conexão com o banco de dados estabelecida!");

    // Inicializa o bot
    const bot = initBot(token);

    console.log("Bragfy está rodando! Pressione CTRL+C para encerrar.");

    // Fecha a conexão com o banco de dados quando a aplicação for encerrada
    const handleShutdown = async () => {
      console.log("Encerrando aplicação...");
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on("SIGINT", handleShutdown);
    process.on("SIGTERM", handleShutdown);
  } catch (error) {
    console.error("Erro ao inicializar a aplicação:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Executa a função principal
main();
