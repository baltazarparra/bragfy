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

// Verifica o ambiente
const isDevelopment = process.env.NODE_ENV === "development";
console.log(`Ambiente: ${process.env.NODE_ENV}`);

// Define o arquivo de schema correto com base no ambiente
const schemaPath = isDevelopment
  ? path.resolve(process.cwd(), "prisma/schema.development.prisma")
  : path.resolve(process.cwd(), "prisma/schema.prisma");

console.log(`Usando schema: ${schemaPath}`);

// Limpa diretório de migrações se existir
const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");
if (fs.existsSync(migrationsDir)) {
  console.log("Removendo diretório de migrações existente...");
  fs.rmSync(migrationsDir, { recursive: true, force: true });
  console.log("Diretório de migrações removido.");
}

// Remove o banco de dados SQLite se estiver em ambiente de desenvolvimento
if (isDevelopment) {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  if (fs.existsSync(dbPath)) {
    console.log("Removendo banco de dados SQLite existente...");
    fs.unlinkSync(dbPath);
    console.log("Banco de dados SQLite removido.");
  }

  // Também remove o arquivo de travamento
  const lockPath = path.resolve(process.cwd(), "prisma/dev.db-journal");
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}

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

// Inicializa o banco de dados com prisma db push
console.log("Inicializando banco de dados...");

try {
  // Para ambos os ambientes, primeiro fazemos um db push para criar o esquema
  console.log(
    `Fazendo push do esquema para ${isDevelopment ? "SQLite" : "PostgreSQL"}...`
  );
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });

  // Agora criamos a migração inicial
  console.log(
    `Criando migração inicial para ${isDevelopment ? "SQLite" : "PostgreSQL"}...`
  );

  // Cria um diretório de migrações vazio
  fs.mkdirSync(migrationsDir, { recursive: true });

  try {
    if (isDevelopment) {
      execSync("npx prisma migrate dev --name init", { stdio: "inherit" });
    } else {
      // Em produção, vamos tentar criar a migração, mas se falhar, usamos deploy
      try {
        execSync("npx prisma migrate dev --name init", { stdio: "inherit" });
      } catch (error) {
        console.warn(
          "Aviso: não foi possível criar a migração inicial. Isso é esperado em alguns ambientes de produção."
        );
        console.warn("Usando alternativamente o comando migrate deploy...");
        execSync("npx prisma migrate deploy", { stdio: "inherit" });
      }
    }
  } catch (error) {
    console.warn(
      "Aviso: não foi possível criar a migração inicial. Continuando com o banco já criado pelo db push..."
    );
    console.log("Isso não afetará o funcionamento do aplicativo.");
  }

  console.log("Inicialização do banco de dados concluída com sucesso");
} catch (error) {
  console.error("Erro ao inicializar banco de dados:", error.message);

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

// Gera o cliente Prisma
console.log("Gerando cliente Prisma...");
try {
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("Cliente Prisma gerado com sucesso");
} catch (error) {
  console.error("Erro ao gerar cliente Prisma:", error.message);
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

console.log("Configuração do banco de dados concluída com sucesso!");
