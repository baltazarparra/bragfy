import { PrismaClient } from "@prisma/client";

// Interface para o tipo User
export interface User {
  id: number;
  telegramId: number;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para o tipo Activity
export interface Activity {
  id: number;
  content: string;
  userId: number;
  urgency?: string | null;
  impact?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para o tipo UserAnalysis
export interface UserAnalysis {
  id: string;
  userId: number;
  telegramId: number;
  content: string;
  createdAt: Date;
}

// Criação de instância do PrismaClient com tratamento de erro
let prismaInstance: PrismaClient;

try {
  prismaInstance = new PrismaClient();
  console.log("PrismaClient inicializado com sucesso");
} catch (error) {
  console.error("Erro ao inicializar PrismaClient:", error);
  throw error;
}

// Exporta a instância do PrismaClient
export const prisma = prismaInstance;

export default prismaInstance;
