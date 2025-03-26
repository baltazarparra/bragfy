import { PrismaClient } from "@prisma/client";

// Inicialização do cliente Prisma com log em desenvolvimento
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"]
});

/**
 * Verifica a conexão com o banco de dados
 * @returns Promise que resolve quando a conexão está funcional
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Executamos uma query simples para verificar a conexão
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    return false;
  }
}

export default prisma;
