import dotenv from "dotenv";
import { initBot } from "./bot";

// Carrega variáveis de ambiente
dotenv.config();

// Verifica se o token do bot está configurado
const token = process.env.TELEGRAM_BOT_TOKEN || "";
if (!token && process.env.NODE_ENV === "production") {
  console.error(
    "❌ ERRO: Token do bot do Telegram não encontrado! Certifique-se de configurar TELEGRAM_BOT_TOKEN no arquivo .env para produção"
  );
  process.exit(1);
}

// Função principal de inicialização
const main = async () => {
  try {
    console.log("🚀 Iniciando Bragfy Bot...");

    // Modo de simulação se não houver token do Telegram
    if (!token) {
      console.log(
        "⚠️ Token não configurado. Iniciando em modo de simulação..."
      );
      // A própria inicialização do bot já vai entrar em modo de simulação
    }

    // Inicializa o bot
    const bot = initBot(token);

    console.log("✅ Bragfy está rodando! Pressione CTRL+C para encerrar.");

    // Encerra a aplicação corretamente
    const handleShutdown = async () => {
      console.log("🛑 Encerrando aplicação...");
      process.exit(0);
    };

    process.on("SIGINT", handleShutdown);
    process.on("SIGTERM", handleShutdown);
  } catch (error) {
    console.error("❌ Erro ao inicializar a aplicação:", error);
    process.exit(1);
  }
};

// Previne erros não tratados de encerrarem o bot
process.on("uncaughtException", (error) => {
  console.error(`❌ Erro não tratado: ${error.message}`);
  console.error(error.stack);
});

// Previne rejeições de promessas não tratadas de encerrarem o bot
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Promessa rejeitada não tratada:");
  console.error(reason);
});

// Executa a função principal
main();
