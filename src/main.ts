import dotenv from "dotenv";
import { initBot, getBotStatus } from "./bot";
import express from "express";

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

// Determina se estamos rodando no Render
const isRender = !!process.env.RENDER;
// Obtém a porta do ambiente ou usa 3000 como padrão
const PORT = process.env.PORT || 3000;

// Função para manter o processo vivo sem usar servidor HTTP
const keepAlive = () => {
  console.log("🔄 Mantendo processo vivo...");
  // Executa a cada minuto para manter o processo vivo
  return setInterval(() => {
    const timestamp = new Date().toISOString();
    console.log(`🔄 Processo ativo em ${timestamp}`);
  }, 60 * 1000);
};

// Configura um servidor HTTP mínimo para health checks se necessário
const setupHealthServer = () => {
  const app = express();

  // Rota de health check aprimorada com informações do bot
  app.get("/health", (req, res) => {
    const botStatus = getBotStatus();

    const healthData = {
      status: botStatus.status === "online" ? "ok" : "initializing",
      timestamp: new Date().toISOString(),
      bot: {
        ...botStatus,
        memory: {
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        }
      },
      env: process.env.NODE_ENV || "development"
    };

    res.status(200).json(healthData);
  });

  // Rota raiz
  app.get("/", (req, res) => {
    res.status(200).json({
      name: "Bragfy Agent",
      status: "running",
      env: process.env.NODE_ENV || "development"
    });
  });

  // Inicia o servidor
  return app.listen(PORT, () => {
    console.log(`🌐 Servidor HTTP para health checks rodando na porta ${PORT}`);
  });
};

// Função principal de inicialização
const main = async () => {
  try {
    console.log("🚀 Iniciando Bragfy Agent...");

    // Inicializa o bot
    const bot = initBot(token);

    // Configura o ambiente baseado no contexto
    if (isRender) {
      if (process.env.NODE_ENV === "production") {
        console.log("☁️ Rodando como worker em ambiente Render (produção)");
        // Em produção no Render, configuramos um servidor HTTP básico para health checks
        setupHealthServer();
      } else {
        console.log("☁️ Rodando em ambiente Render (não-produção)");
        // Mantém o processo vivo sem servidor HTTP
        keepAlive();
      }
    } else if (!token) {
      // Modo de simulação local sem token do Telegram
      console.log(
        "⚠️ Token não configurado. Iniciando em modo de simulação..."
      );

      // Mensagem de boas-vindas e instruções mais claras
      console.log("\n=== MODO DE SIMULAÇÃO DO BRAGFY ===");
      console.log(
        "Digite comandos diretamente no console para testar a aplicação."
      );
      console.log("Comandos disponíveis:");
      console.log("  /start      - Inicia o bot e processo de onboarding");
      console.log("  /status     - Mostra status da aplicação");
      console.log(
        "  gerar brag  - Simula pedido de geração de documento de texto"
      );
      console.log("  gerar pdf   - Simula pedido de geração de PDF");
      console.log(
        "  [qualquer texto] - Simula o envio de uma mensagem para o bot"
      );
      console.log("  exit        - Sai do modo de simulação\n");

      // Configura o prompt do console
      process.stdout.write("bragfy> ");

      // Cria um listener para o stdin para simular comandos no console
      process.stdin.on("data", (data) => {
        const input = data.toString().trim();

        if (input === "exit") {
          console.log("Saindo do modo de simulação...");
          process.exit(0);
        } else if (input === "/start") {
          console.log("\n🤖 Simulando comando /start...");
          console.log("✅ Comando /start recebido e processado.");
          console.log(
            "✅ Em produção, este comando iniciaria o onboarding do usuário."
          );
          console.log(
            "✅ Usuário seria cadastrado e veria mensagem de boas-vindas."
          );
        } else if (input === "/status") {
          console.log("\n🤖 Status do Bragfy:");
          console.log("✅ Aplicação rodando em modo de simulação");
          console.log("✅ Versão: 1.0.0");
          console.log("✅ Banco de dados: simulado");

          // Exibe status detalhado do bot
          const status = getBotStatus();
          console.log("✅ Estado do bot:", status);
        } else if (input.toLowerCase().includes("gerar pdf")) {
          console.log("\n🤖 Simulando pedido de geração de PDF...");
          console.log("✅ Intenção 'generate_pdf' detectada (score: 0.95)");
          console.log("✅ Em produção, um PDF seria gerado e enviado.");
        } else if (input.toLowerCase().includes("gerar brag")) {
          console.log(
            "\n🤖 Simulando pedido de geração de documento de texto..."
          );
          console.log(
            "✅ Intenção 'generate_brag_text' detectada (score: 0.92)"
          );
          console.log(
            "✅ Em produção, um documento de texto seria gerado e enviado."
          );
        } else if (input.startsWith("/")) {
          console.log(`\n🤖 Simulando comando ${input}...`);
          console.log(`✅ Comando ${input} recebido.`);
          console.log(
            "❓ Este comando não está implementado no modo de simulação."
          );
        } else {
          console.log(`\n🤖 Simulando mensagem: "${input}"`);
          console.log("✅ Mensagem recebida e processada como atividade.");
          console.log(
            "✅ Em produção, esta mensagem seria armazenada como uma atividade."
          );
        }

        // Exibe o prompt novamente
        process.stdout.write("\nbragfy> ");
      });
    } else {
      // Ambiente de desenvolvimento normal com token
      console.log("🏠 Rodando em ambiente de desenvolvimento local");

      // Configurar o servidor HTTP mesmo em desenvolvimento para testes
      setupHealthServer();
    }

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

// Previne erros não tratados de encerrarem o agente
process.on("uncaughtException", (error) => {
  console.error(`❌ Erro não tratado: ${error.message}`);
  console.error(error.stack);
});

// Previne rejeições de promessas não tratadas de encerrarem o agente
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Promessa rejeitada não tratada:");
  console.error(reason);
});

// Executa a função principal
main();
