const { execSync } = require("child_process");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Carrega as variáveis de ambiente do arquivo correto
if (process.env.NODE_ENV === "development") {
  console.log("Carregando ambiente de desenvolvimento");
  dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
} else {
  console.log("Carregando ambiente de produção");
  dotenv.config();
}

// Verifica o ambiente e executa a migração adequada
const isDevelopment = process.env.NODE_ENV === "development";

console.log(`Ambiente: ${process.env.NODE_ENV}`);

// Define o arquivo de schema correto com base no ambiente
const schemaPath = isDevelopment
  ? path.resolve(process.cwd(), "prisma/schema.development.prisma")
  : path.resolve(process.cwd(), "prisma/schema.prisma");

console.log(`Usando schema: ${schemaPath}`);

// Copia o schema correto para schema.prisma temporariamente
if (isDevelopment && fs.existsSync(schemaPath)) {
  const originalSchema = fs.readFileSync(
    path.resolve(process.cwd(), "prisma/schema.prisma"),
    "utf8"
  );
  const developmentSchema = fs.readFileSync(schemaPath, "utf8");

  // Guarda uma cópia do schema original
  fs.writeFileSync(
    path.resolve(process.cwd(), "prisma/schema.prisma.backup"),
    originalSchema,
    "utf8"
  );

  // Substitui pelo schema de desenvolvimento
  fs.writeFileSync(
    path.resolve(process.cwd(), "prisma/schema.prisma"),
    developmentSchema,
    "utf8"
  );

  console.log("Schema temporário configurado para ambiente de desenvolvimento");
}

// Verifica qual comando de migração executar
if (process.argv.includes("--dev") || process.argv.includes("-d")) {
  // Se o usuário explicitamente pedir para rodar migrate dev
  if (!isDevelopment) {
    console.error("\x1b[31mALERTA DE SEGURANÇA!\x1b[0m");
    console.error(
      "Você está tentando executar `prisma migrate dev` em ambiente de produção."
    );
    console.error(
      "Isso pode causar problemas graves, pois o shadow database requer privilégios de superusuário."
    );
    console.error("Use `npm run migrate:prod` para ambientes de produção.");

    const forceFlag = process.argv.includes("--force");
    if (!forceFlag) {
      // Restaura o schema original se estiver em ambiente de desenvolvimento
      if (
        isDevelopment &&
        fs.existsSync(
          path.resolve(process.cwd(), "prisma/schema.prisma.backup")
        )
      ) {
        const originalSchema = fs.readFileSync(
          path.resolve(process.cwd(), "prisma/schema.prisma.backup"),
          "utf8"
        );
        fs.writeFileSync(
          path.resolve(process.cwd(), "prisma/schema.prisma"),
          originalSchema,
          "utf8"
        );
        fs.unlinkSync(
          path.resolve(process.cwd(), "prisma/schema.prisma.backup")
        );
      }

      console.error(
        "Se você realmente deseja continuar, use a flag --force (não recomendado)"
      );
      process.exit(1);
    }
    console.warn("Continuando com --force (não recomendado)");
  }

  console.log("Executando prisma migrate dev");
  try {
    execSync("npx prisma migrate dev", { stdio: "inherit" });
    console.log("Migração de desenvolvimento concluída com sucesso");
  } catch (error) {
    console.error("Erro ao executar prisma migrate dev:", error.message);

    // Restaura o schema original se estiver em ambiente de desenvolvimento
    if (
      isDevelopment &&
      fs.existsSync(path.resolve(process.cwd(), "prisma/schema.prisma.backup"))
    ) {
      const originalSchema = fs.readFileSync(
        path.resolve(process.cwd(), "prisma/schema.prisma.backup"),
        "utf8"
      );
      fs.writeFileSync(
        path.resolve(process.cwd(), "prisma/schema.prisma"),
        originalSchema,
        "utf8"
      );
      fs.unlinkSync(path.resolve(process.cwd(), "prisma/schema.prisma.backup"));
    }

    process.exit(1);
  }
} else {
  // Caso contrário, execute migrate deploy (seguro para produção)
  console.log("Executando prisma migrate deploy");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("Migração deploy concluída com sucesso");
  } catch (error) {
    console.error("Erro ao executar prisma migrate deploy:", error.message);

    // Restaura o schema original se estiver em ambiente de desenvolvimento
    if (
      isDevelopment &&
      fs.existsSync(path.resolve(process.cwd(), "prisma/schema.prisma.backup"))
    ) {
      const originalSchema = fs.readFileSync(
        path.resolve(process.cwd(), "prisma/schema.prisma.backup"),
        "utf8"
      );
      fs.writeFileSync(
        path.resolve(process.cwd(), "prisma/schema.prisma"),
        originalSchema,
        "utf8"
      );
      fs.unlinkSync(path.resolve(process.cwd(), "prisma/schema.prisma.backup"));
    }

    process.exit(1);
  }
}

// Gere o cliente Prisma
console.log("Gerando cliente Prisma");
try {
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("Cliente Prisma gerado com sucesso");
} catch (error) {
  console.error("Erro ao gerar cliente Prisma:", error.message);

  // Restaura o schema original se estiver em ambiente de desenvolvimento
  if (
    isDevelopment &&
    fs.existsSync(path.resolve(process.cwd(), "prisma/schema.prisma.backup"))
  ) {
    const originalSchema = fs.readFileSync(
      path.resolve(process.cwd(), "prisma/schema.prisma.backup"),
      "utf8"
    );
    fs.writeFileSync(
      path.resolve(process.cwd(), "prisma/schema.prisma"),
      originalSchema,
      "utf8"
    );
    fs.unlinkSync(path.resolve(process.cwd(), "prisma/schema.prisma.backup"));
  }

  process.exit(1);
}

// Restaura o schema original se estiver em ambiente de desenvolvimento
if (
  isDevelopment &&
  fs.existsSync(path.resolve(process.cwd(), "prisma/schema.prisma.backup"))
) {
  const originalSchema = fs.readFileSync(
    path.resolve(process.cwd(), "prisma/schema.prisma.backup"),
    "utf8"
  );
  fs.writeFileSync(
    path.resolve(process.cwd(), "prisma/schema.prisma"),
    originalSchema,
    "utf8"
  );
  fs.unlinkSync(path.resolve(process.cwd(), "prisma/schema.prisma.backup"));
  console.log("Schema original restaurado");
}
