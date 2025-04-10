import { v4 as uuidv4 } from 'uuid';
import TelegramBot from "node-telegram-bot-api";

// Constantes para mensagens de erro padronizadas
export const ERROR_MESSAGES = {
  GENERIC: 'Ops! Ocorreu um erro ao processar sua solicitação',
  UNRECOVERABLE: 'Ocorreu um erro crítico. Por favor, tente novamente usando o comando /start',
  MESSAGE_PROCESSING: 'Ops! Ocorreu um erro ao processar sua mensagem',
  USER_NOT_FOUND: 'Não foi possível recuperar seus dados',
  DATABASE: 'Erro ao acessar o banco de dados',
  CALLBACK: 'Erro ao processar sua solicitação',
  ACTIVITY_CREATION: 'Erro ao registrar sua atividade'
};

// Interface para logs de erro estruturados
interface ErrorLogData {
  traceId: string;
  error: Error | unknown;
  userId?: number;
  messageId?: number;
  chatId?: number;
  context?: string;
  messageText?: string;
  callbackData?: string;
  state?: Record<string, any>;
}

/**
 * Gera um ID único para rastreamento de erros
 */
export function generateTraceId(): string {
  return uuidv4().slice(0, 8);
}

/**
 * Registra um erro detalhado no console com todas as informações relevantes
 */
export function logError(data: ErrorLogData): void {
  console.error(`
=================== ERRO [${data.traceId}] ===================
Timestamp: ${new Date().toISOString()}
Usuário: ${data.userId || 'N/A'}
Chat: ${data.chatId || 'N/A'}
Mensagem ID: ${data.messageId || 'N/A'}
Contexto: ${data.context || 'N/A'}
Texto da mensagem: ${data.messageText || 'N/A'}
Callback data: ${data.callbackData || 'N/A'}
Estado: ${JSON.stringify(data.state || {}, null, 2)}

Erro: ${data.error instanceof Error ? data.error.message : String(data.error)}
Stack: ${data.error instanceof Error ? data.error.stack : 'Indisponível'}
=============================================================
`);
}

/**
 * Cria uma mensagem de erro amigável para o usuário, incluindo um ID de rastreamento
 */
export function createUserErrorMessage(traceId: string, baseMessage: string = ERROR_MESSAGES.GENERIC): string {
  return `${baseMessage}. Por favor, tente novamente ou use o comando /start para reiniciar a conversa.\n\nCódigo: ${traceId}`;
}

/**
 * Registra o erro e envia uma mensagem amigável ao usuário
 */
export async function handleUserError(
  bot: TelegramBot,
  chatId: number,
  error: Error | unknown,
  context: string,
  info: {
    userId?: number;
    messageId?: number;
    messageText?: string;
    callbackData?: string;
    state?: Record<string, any>;
    baseMessage?: string;
  } = {}
): Promise<string> {
  const traceId = generateTraceId();
  
  // Registra o erro detalhado
  logError({
    traceId,
    error,
    userId: info.userId,
    messageId: info.messageId,
    chatId,
    context,
    messageText: info.messageText,
    callbackData: info.callbackData,
    state: info.state
  });
  
  // Cria e envia mensagem de erro para o usuário
  const errorMessage = createUserErrorMessage(traceId, info.baseMessage);
  try {
    await bot.sendMessage(chatId, errorMessage);
  } catch (sendError) {
    console.error(`[${traceId}] Erro ao enviar mensagem de erro:`, sendError);
  }
  
  return traceId;
} 