// Tipos para o Brag Document
export interface BragActivity {
  id: number;
  content: string;
  date: string | Date;
  urgency?: "high" | "medium" | "low";
  impact?: "high" | "medium" | "low";
}

export interface BragUser {
  id: number;
  firstName: string;
  lastName?: string;
  telegramId: number;
  username?: string;
}

export interface BragDocument {
  user: BragUser;
  activities: BragActivity[];
  generatedAt: string | Date;
  period: number; // 1, 7, 30 dias
}

// Tipos para o serviço de compartilhamento
export interface ShareService {
  generateUserHash(user: BragUser): string;
  saveBragDocument(hash: string, document: BragDocument): Promise<void>;
  getBragDocument(hash: string): Promise<BragDocument | null>;
  getShareUrl(hash: string): string;
}
