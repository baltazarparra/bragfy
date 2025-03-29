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

// Exporta uma instância real do PrismaClient
export const prisma = new PrismaClient();

export default prisma;
