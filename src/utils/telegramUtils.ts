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

  // Verifica se é um Brag Document
  const isBragDocument =
    text.includes("*BRAG DOCUMENT*") && text.includes("*ATIVIDADES*");

  if (isBragDocument) {
    console.log(
      "[TELEGRAM] Detectado Brag Document, dividindo de forma inteligente"
    );

    // Divide o cabeçalho e as atividades
    const headerEndIndex = text.indexOf("*ATIVIDADES*");
    if (headerEndIndex > 0) {
      // Captura todo o cabeçalho até ATIVIDADES inclusive
      const activityHeaderPos = text.indexOf("\n", headerEndIndex);
      const header = text.substring(0, activityHeaderPos + 1);

      // Resto do documento após o cabeçalho
      const activitiesSection = text.substring(activityHeaderPos + 1);

      // Adiciona o cabeçalho como primeira parte se não for muito longo
      if (header.length <= maxLength) {
        parts.push(header);
        remaining = activitiesSection;
      } else {
        // Cabeçalho muito longo (raro), usa divisão padrão
        remaining = text;
      }

      // Divide a seção de atividades em blocos
      if (parts.length > 0) {
        // Se temos um cabeçalho separado
        // Padrão de divisor entre atividades
        const activityDividers = [
          "\n· · · · · · · · · ·\n",
          "\n_[0-9]{4}-[0-9]{2}-[0-9]{2}_\n"
        ];

        while (remaining.length > 0) {
          if (remaining.length <= maxLength) {
            parts.push(remaining);
            break;
          }

          // Tenta encontrar um divisor de atividade antes do limite
          let splitPos = -1;

          for (const dividerPattern of activityDividers) {
            // Encontra a última ocorrência do divisor antes do limite
            const regex = new RegExp(dividerPattern, "g");
            let match: RegExpExecArray | null;
            let lastPos = -1;

            // Busca a última ocorrência antes do limite
            while ((match = regex.exec(remaining)) !== null) {
              if (match.index < maxLength) {
                lastPos = match.index;
              } else {
                break;
              }
            }

            if (lastPos > 0 && lastPos > splitPos) {
              splitPos = lastPos;
            }
          }

          // Se não encontrou divisor, tenta em uma quebra de linha
          if (splitPos === -1) {
            splitPos = remaining.lastIndexOf("\n", maxLength);
          }

          // Em último caso, corta no comprimento máximo
          if (splitPos === -1 || splitPos < maxLength / 2) {
            splitPos = maxLength;
          }

          // Verifica se estamos cortando no meio de uma formatação Markdown
          let adjustedSplitPos = splitPos;
          // Verifica asteriscos e sublinhados desbalanceados
          const prefix = remaining.substring(0, adjustedSplitPos);
          const asteriskCount = (prefix.match(/\*/g) || []).length;
          const underscoreCount = (prefix.match(/_/g) || []).length;

          if (asteriskCount % 2 !== 0 || underscoreCount % 2 !== 0) {
            // Busca a última quebra de linha segura antes do ponto de corte
            const safePos = remaining.lastIndexOf("\n", adjustedSplitPos - 50);
            if (safePos > 0 && safePos > adjustedSplitPos / 2) {
              adjustedSplitPos = safePos;
            }
          }

          parts.push(remaining.substring(0, adjustedSplitPos));
          remaining = remaining.substring(adjustedSplitPos).trim();

          // Adiciona cabeçalho de continuação se não for a última parte
          if (remaining.length > 0) {
            remaining = "*ATIVIDADES (continuação)*\n" + remaining;
          }
        }
      }
    }
  }

  // Se não conseguimos dividir como Brag Document ou não é um, usa divisão padrão
  if (parts.length === 0) {
    while (remaining.length > 0) {
      // Encontra um ponto adequado para dividir a mensagem
      let splitIndex = remaining.lastIndexOf("\n", maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        // Se não encontrou uma quebra de linha, divide por espaço
        splitIndex = remaining.lastIndexOf(" ", maxLength);
      }
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        // Em último caso, divide exatamente no comprimento máximo
        splitIndex = maxLength;
      }

      // Verifica se estamos cortando no meio de uma formatação Markdown
      let adjustedSplitIndex = splitIndex;
      const prefix = remaining.substring(0, adjustedSplitIndex);
      const asteriskCount = (prefix.match(/\*/g) || []).length;
      const underscoreCount = (prefix.match(/_/g) || []).length;

      if (asteriskCount % 2 !== 0 || underscoreCount % 2 !== 0) {
        // Busca por posição segura antes do ponto de corte
        const safePos = remaining.lastIndexOf("\n", adjustedSplitIndex - 20);
        if (safePos > 0 && safePos > adjustedSplitIndex / 2) {
          adjustedSplitIndex = safePos;
        }
      }

      parts.push(remaining.substring(0, adjustedSplitIndex));
      remaining = remaining.substring(adjustedSplitIndex).trim();
    }
  }

  console.log(`[TELEGRAM] Mensagem dividida em ${parts.length} partes`);
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
    } catch (sanitizeError: unknown) {
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
          } catch (error: unknown) {
            console.error(
              "[TELEGRAM] Erro ao enviar parte da mensagem:",
              error
            );
            // Tentar enviar sem formatação em caso de erro
            try {
              const plainOptions = { ...cleanOptions };
              const message = await bot.sendMessage(chatId, part, plainOptions);
              messages.push(message);
            } catch (plainError: unknown) {
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

      // Verifica se é um Brag Document (para tratamento especial de botões inline)
      const isBragDocument =
        text.includes("*BRAG DOCUMENT*") && text.includes("*ATIVIDADES*");
      const hasInlineKeyboard =
        messageOptions.reply_markup &&
        "inline_keyboard" in messageOptions.reply_markup &&
        messageOptions.reply_markup.inline_keyboard.length > 0;

      // Para cada parte da mensagem
      for (let i = 0; i < messageParts.length; i++) {
        const part = messageParts[i];
        try {
          // Apenas a primeira parte mantém os botões inline
          const partOptions = { ...messageOptions };

          // Se não for a primeira parte e tiver botões, remove-os para as partes subsequentes
          if (i > 0 && isBragDocument && hasInlineKeyboard) {
            // Remove os botões inline, mas mantém outras opções
            if (
              partOptions.reply_markup &&
              "inline_keyboard" in partOptions.reply_markup
            ) {
              delete partOptions.reply_markup;
            }
          }

          // Adiciona um log para monitorar o tamanho da mensagem
          console.log(
            `[TELEGRAM] Enviando parte ${i + 1}/${messageParts.length} com ${part.length} caracteres`
          );

          const message = await bot.sendMessage(chatId, part, partOptions);
          messages.push(message);
        } catch (error: unknown) {
          console.error("[TELEGRAM] Erro ao enviar parte da mensagem:", error);
          // Tentar enviar sem formatação em caso de erro
          try {
            const plainOptions = { ...messageOptions };
            delete plainOptions.parse_mode;

            // Remove botões inline se não for a primeira parte
            if (i > 0 && isBragDocument && hasInlineKeyboard) {
              if (
                plainOptions.reply_markup &&
                "inline_keyboard" in plainOptions.reply_markup
              ) {
                delete plainOptions.reply_markup;
              }
            }

            const message = await bot.sendMessage(chatId, part, plainOptions);
            messages.push(message);
          } catch (plainError: unknown) {
            console.error(
              "[TELEGRAM] Erro ao enviar sem formatação:",
              plainError
            );
          }
        }
      }

      return messages;
    }
  } catch (error: unknown) {
    console.error("[TELEGRAM] Erro ao enviar mensagem:", error);
    // Última tentativa: enviar mensagem simples de erro
    try {
      return bot.sendMessage(
        chatId,
        "Não foi possível enviar a mensagem formatada. Por favor, tente novamente mais tarde."
      );
    } catch (finalError: unknown) {
      console.error(
        "[TELEGRAM] Erro fatal ao enviar mensagem de fallback:",
        finalError
      );
      throw error; // Propagar o erro original
    }
  }
}
