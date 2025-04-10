const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("=== Configuração do Bragfy ===");
console.log(
  "Este script irá configurar o ambiente para desenvolvimento ou produção."
);

rl.question(
  "Qual ambiente você deseja configurar? (development/production) [development]: ",
  (environment) => {
    environment = environment.toLowerCase() || "development";

    if (environment !== "development" && environment !== "production") {
      console.error('Ambiente inválido. Use "development" ou "production".');
      rl.close();
      process.exit(1);
    }

    console.log(`Configurando ambiente: ${environment}`);

    // Define o arquivo .env correto
    const envFile = environment === "development" ? ".env.development" : ".env";

    // Verifica se o arquivo .env existe
    if (!fs.existsSync(path.resolve(process.cwd(), envFile))) {
      console.error(
        `Arquivo ${envFile} não encontrado. Crie o arquivo com as configurações necessárias.`
      );
      console.log(`Exemplo para ambiente de ${environment}:`);

      if (environment === "development") {
        console.log(`
DATABASE_URL="file:./prisma/dev.db"
TELEGRAM_BOT_TOKEN="seu-token-do-telegram"
NODE_ENV="development"
        `);
      } else {
        console.log(`
DATABASE_URL="sua-url-do-postgresql"
TELEGRAM_BOT_TOKEN="seu-token-do-telegram"
NODE_ENV="production"
        `);
      }

      rl.close();
      process.exit(1);
    }

    // Define a variável NODE_ENV
    process.env.NODE_ENV = environment;

    // Pergunta se o usuário deseja inicializar o banco de dados do zero
    rl.question(
      "Deseja inicializar o banco de dados do zero? (y/n) [n]: ",
      (resetDatabase) => {
        resetDatabase = resetDatabase.toLowerCase() === "y";

        try {
          if (resetDatabase) {
            console.log("Inicializando banco de dados do zero...");
            if (environment === "development") {
              execSync("npm run db:init", { stdio: "inherit" });
            } else {
              execSync("npm run db:init:prod", { stdio: "inherit" });
            }
          } else {
            console.log("Executando migrações do banco de dados...");
            if (environment === "development") {
              execSync("npm run db:migrate", { stdio: "inherit" });
            } else {
              execSync("npm run migrate:prod", { stdio: "inherit" });
            }
          }

          console.log("Configuração concluída com sucesso!");
          console.log(
            `\nPara iniciar o projeto em ambiente de ${environment}:`
          );

          if (environment === "development") {
            console.log("npm run dev");
          } else {
            console.log("npm run build && npm start");
          }
        } catch (error) {
          console.error("Erro durante a configuração:", error.message);
          process.exit(1);
        } finally {
          rl.close();
        }
      }
    );
  }
);
