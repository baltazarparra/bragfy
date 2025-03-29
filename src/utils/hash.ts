import crypto from "crypto";
import { BragUser } from "../types";

/**
 * Gera um hash seguro para um usuário baseado no ID do Telegram e nome de usuário
 * @param user Objeto de usuário contendo telegramId e opcionalmente username
 * @param salt String adicional para aumentar a segurança do hash
 * @returns Hash SHA-256 que pode ser usado em URLs públicas
 */
export function generateUserHash(user: BragUser, salt: string): string {
  const input = `${user.telegramId}:${user.username || ""}:${salt}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}
