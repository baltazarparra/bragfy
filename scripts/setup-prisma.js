#!/usr/bin/env node

/**
 * Script para configurar o Prisma Client no ambiente de produção
 * Isso garante que o Prisma Client seja gerado corretamente antes de iniciar a aplicação
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Configuração do ambiente
const isProd = process.env.NODE_ENV === "production";
console.log(`Ambiente: ${isProd ? "Produção" : "Desenvolvimento"}`);

try {
  console.log("Gerando o Prisma Client...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("Prisma Client gerado com sucesso!");

  // Verificar se os arquivos do Prisma Client foram gerados
  const clientPath = path.join(
    process.cwd(),
    "node_modules",
    ".prisma",
    "client"
  );
  const prismaClientPath = path.join(
    process.cwd(),
    "node_modules",
    "@prisma",
    "client"
  );

  if (fs.existsSync(clientPath)) {
    console.log(
      "Verificação: diretório do Prisma Client (.prisma/client) existe."
    );
  } else {
    console.warn(
      "Aviso: diretório do Prisma Client (.prisma/client) não encontrado!"
    );
  }

  if (fs.existsSync(prismaClientPath)) {
    console.log(
      "Verificação: diretório do Prisma Client (@prisma/client) existe."
    );
  } else {
    console.warn(
      "Aviso: diretório do Prisma Client (@prisma/client) não encontrado!"
    );
  }

  // Verificar se o diretório dist existe
  const distPath = path.join(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    console.warn(
      "Aviso: diretório dist não encontrado! Será criado durante o build."
    );
  } else {
    console.log("Verificação: diretório dist existe.");

    // Verificar se o arquivo main.js existe
    const mainJsPath = path.join(distPath, "main.js");
    if (fs.existsSync(mainJsPath)) {
      console.log("Verificação: arquivo dist/main.js existe.");
    } else {
      console.warn(
        "Aviso: arquivo dist/main.js não encontrado! Será criado durante o build."
      );
    }
  }
} catch (error) {
  console.error("Erro ao gerar o Prisma Client:", error);
  process.exit(1);
}
