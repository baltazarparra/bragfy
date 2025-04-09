import TelegramBot from "node-telegram-bot-api";

/**
 * Escapa caracteres especiais do Markdown para evitar erros de parsing
 * @param text Texto para escapar
 * @returns Texto com caracteres especiais escapados
 */
export function escapeMarkdown(text: string): string {
  if (!text) return "";

  // Lista de caracteres especiais que precisam ser escapados no Markdown
  const markdownChars = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!"
  ];

  let escapedText = text;

  // Escapar cada caractere especial
  markdownChars.forEach((char) => {
    // Criamos uma regex para não substituir caracteres já escapados
    const regex = new RegExp(
      `(?<!\\\\)${char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "g"
    );
    escapedText = escapedText.replace(regex, `\\${char}`);
  });

  return escapedText;
}

/**
 * Divide um texto longo em múltiplas partes respeitando o limite do Telegram
 * @param text Texto a ser dividido
 * @param maxLength Tamanho máximo de cada parte (padrão: 4000 caracteres)
 * @returns Array com as partes do texto
 */
export function splitLongMessage(
  text: string,
  maxLength: number = 4000
): string[] {
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Encontra um ponto adequado para dividir a mensagem (preferencialmente em uma quebra de linha)
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // Se não encontrou uma quebra de linha, divide por espaço
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // Em último caso, divide exatamente no comprimento máximo
      splitIndex = maxLength;
    }

    parts.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex).trim();
  }

  return parts;
}

/**
 * Envia uma mensagem com Markdown sanitizado, lidando com erros de parsing
 * e dividindo mensagens longas conforme necessário
 *
 * @param bot Instância do bot do Telegram
 * @param chatId ID do chat para enviar a mensagem
 * @param text Texto da mensagem (com ou sem formatação Markdown)
 * @param options Opções adicionais para a mensagem
 * @returns Promise com o resultado do envio
 */
export async function sendSafeMarkdown(
  bot: TelegramBot,
  chatId: number,
  text: string,
  options: TelegramBot.SendMessageOptions = {}
): Promise<TelegramBot.Message | TelegramBot.Message[]> {
  if (!text) {
    return bot.sendMessage(
      chatId,
      "Não foi possível enviar a mensagem (vazia)"
    );
  }

  try {
    // Configurar opções padrão com Markdown
    const messageOptions: TelegramBot.SendMessageOptions = {
      parse_mode: "Markdown",
      ...options
    };

    // Tentar sanitizar o texto para Markdown
    let sanitizedText = "";
    try {
      sanitizedText = escapeMarkdown(text);
    } catch (sanitizeError) {
      console.warn("[TELEGRAM] Erro ao sanitizar Markdown:", sanitizeError);
      // Fallback: enviar sem parse_mode - garantir que seja deletado
      delete messageOptions.parse_mode;
      messageOptions.parse_mode = undefined;

      // Criar um novo objeto de opções sem o parse_mode
      const cleanOptions = { ...messageOptions };
      delete cleanOptions.parse_mode;

      sanitizedText = text;

      // Dividir mensagens longas
      const messageParts = splitLongMessage(sanitizedText);

      if (messageParts.length === 1) {
        // Apenas uma parte, enviar normalmente
        return bot.sendMessage(chatId, messageParts[0], cleanOptions);
      } else {
        // Múltiplas partes, enviar em sequência
        console.log(
          `[TELEGRAM] Dividindo mensagem longa em ${messageParts.length} partes`
        );
        const messages: TelegramBot.Message[] = [];

        for (const part of messageParts) {
          try {
            const message = await bot.sendMessage(chatId, part, cleanOptions);
            messages.push(message);
          } catch (error) {
            console.error(
              "[TELEGRAM] Erro ao enviar parte da mensagem:",
              error
            );
            // Tentar enviar sem formatação em caso de erro
            try {
              const plainOptions = { ...cleanOptions };
              const message = await bot.sendMessage(chatId, part, plainOptions);
              messages.push(message);
            } catch (plainError) {
              console.error(
                "[TELEGRAM] Erro ao enviar sem formatação:",
                plainError
              );
            }
          }
        }

        return messages;
      }
    }

    // Código existente continua aqui para o caso de sanitização bem-sucedida
    // Dividir mensagens longas
    const messageParts = splitLongMessage(sanitizedText);

    if (messageParts.length === 1) {
      // Apenas uma parte, enviar normalmente
      return bot.sendMessage(chatId, messageParts[0], messageOptions);
    } else {
      // Múltiplas partes, enviar em sequência
      console.log(
        `[TELEGRAM] Dividindo mensagem longa em ${messageParts.length} partes`
      );
      const messages: TelegramBot.Message[] = [];

      for (const part of messageParts) {
        try {
          const message = await bot.sendMessage(chatId, part, messageOptions);
          messages.push(message);
        } catch (error) {
          console.error("[TELEGRAM] Erro ao enviar parte da mensagem:", error);
          // Tentar enviar sem formatação em caso de erro
          try {
            const plainOptions = { ...messageOptions };
            const message = await bot.sendMessage(chatId, part, plainOptions);
            messages.push(message);
          } catch (plainError) {
            console.error(
              "[TELEGRAM] Erro ao enviar sem formatação:",
              plainError
            );
          }
        }
      }

      return messages;
    }
  } catch (error) {
    console.error("[TELEGRAM] Erro ao enviar mensagem:", error);
    // Última tentativa: enviar mensagem simples de erro
    try {
      return bot.sendMessage(
        chatId,
        "Não foi possível enviar a mensagem formatada. Por favor, tente novamente mais tarde."
      );
    } catch (finalError) {
      console.error(
        "[TELEGRAM] Erro fatal ao enviar mensagem de fallback:",
        finalError
      );
      throw error; // Propagar o erro original
    }
  }
}
