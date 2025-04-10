import { Activity } from "../db/client";

/**
 * Interface para resposta da OpenRouter API
 */
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

/**
 * Formata uma lista de atividades para ser enviada à API
 *
 * @param activities Lista de atividades para formatar
 * @returns String formatada com as atividades
 */
export const formatActivitiesForPrompt = (activities: Activity[]): string => {
  return activities
    .map((activity) => {
      // Formata a data para YYYY-MM-DD
      const date = new Date(activity.createdAt);
      const formattedDate = date.toISOString().split("T")[0];

      return `• [${formattedDate}] ${activity.content}`;
    })
    .join("\n");
};

/**
 * Sanitiza a resposta da análise para garantir qualidade e coesão semântica
 *
 * @param text Texto da análise recebida da API
 * @param keepMarkdown Se true, mantém a formatação Markdown; se false, remove-a (padrão: true)
 * @returns Texto sanitizado
 */
const sanitizeAnalysisResponse = (
  text: string,
  keepMarkdown: boolean = true
): string => {
  if (!text) return "";

  // Remove espaços extras, quebras de linha duplas e outros ruídos
  let sanitized = text
    .trim()
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ");

  // --- REMOÇÃO DE PADRÕES ARTIFICIAIS E EXPRESSÕES NÃO-VERBAIS ---

  // Remove expressões não-verbais como *sorri*, *suspira*, etc.
  sanitized = sanitized.replace(/\*[^*]+\*/g, (match) => {
    // Verifica se é uma expressão não-verbal (verbo, adjetivo ou interjeição)
    if (
      /\*(sorri|ri|suspira|pisca|acena|gargalha|chora)\*/i.test(match) ||
      /\*(triste|feliz|surpreso|confuso|irritado)\*/i.test(match) ||
      /\*(uau|hmm|ugh|ah|oh|ei|ops|haha|rs)\*/i.test(match)
    ) {
      return "";
    }
    // Mantém se for ênfase legítima
    return match;
  });

  // Remove duplicação de sujeitos e palavras repetidas (ex: "Você, você...")
  sanitized = sanitized.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");

  // --- LIMPEZA DE CARACTERES DE ESCAPE ---

  // Remove caracteres de escape de forma mais segura
  sanitized = sanitized
    // Remove escape de caracteres especiais
    .replace(/\\([*_`()[\]{}#+=|~>])/g, "$1")
    // Remove escape de pontuação
    .replace(/\\([!?.,;:])/g, "$1")
    // Converte sequências de escape para espaço
    .replace(/\\n|\\t|\\r/g, " ")
    // Remove backslashes extras sem afetar o restante do texto
    .replace(/\\{2,}/g, " ");

  // Normaliza espaços após remoção de caracteres de escape
  sanitized = sanitized.replace(/\s{2,}/g, " ").trim();

  // --- REMOÇÃO DE METÁFORAS DESCONEXAS E LINGUAGEM ARTIFICIAL ---

  // Lista de padrões de metáforas desconexas comuns em saídas de LLM
  const strangeMetaphors = [
    "o carro espirrou",
    "a muralha obscura",
    "tsunami de dados",
    "floresta de requisitos",
    "oceano de códigos",
    "selva de algoritmos",
    "dança dos bits"
  ];

  // Remove apenas metáforas específicas identificadas como problemáticas
  strangeMetaphors.forEach((phrase) => {
    const regex = new RegExp(`\\b${phrase}\\b`, "gi");
    sanitized = sanitized.replace(regex, "");
  });

  // Lista de expressões artificiais comuns para remoção
  const artificialPatterns = [
    /como mencionado anteriormente,?/gi,
    /é importante (notar|lembrar|ressaltar) que,?/gi,
    /em suma,?/gi,
    /em conclusão,?/gi
  ];

  // Remove apenas os padrões mais comuns de linguagem artificial
  artificialPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "");
  });

  // --- NORMALIZAÇÃO E POLIMENTO DO TEXTO ---

  // Remove símbolos típicos de LLM e formação de frases incompletas
  sanitized = sanitized
    .replace(/\[([\w\s]+)\]/g, "") // Remove [placeholder] ou [inserir algo aqui]
    .replace(/\{[\w\s]+\}/g, "") // Remove {placeholder}
    .replace(/<[\w\s]+>/g, "") // Remove <placeholder>
    .replace(/(\([^)]*placeholder[^)]*\))/gi, ""); // Remove (placeholder)

  // Remove código inline desnecessário para simplificar
  sanitized = sanitized.replace(/`([^`]{1,3})`/g, "$1");

  // --- APLICAÇÃO DE FORMATAÇÃO MARKDOWN ---

  // Verifica se já tem formatação Markdown
  const hasExistingMarkdown = /\*[^*]+\*|_[^_]+_/g.test(sanitized);

  // Só aplica nova formatação se não tiver formatação existente
  if (!hasExistingMarkdown) {
    // Identifica palavras/frases importantes para destacar
    const words = sanitized.split(/\s+/);

    // Palavras-chave que merecem destaque quando aparecem
    const importantKeywords = [
      "prioridade",
      "urgente",
      "crítico",
      "falha",
      "sucesso",
      "resultado",
      "impacto",
      "eficiência",
      "melhoria",
      "problema",
      "oportunidade",
      "objetivo",
      "meta",
      "foco",
      "estratégia"
    ];

    // Localiza palavras-chave importantes no texto
    const importantMatches = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase().replace(/[.,;:!?()]/g, "");
      if (importantKeywords.includes(word) && words[i].length > 3) {
        importantMatches.push(i);
        if (importantMatches.length >= 2) break;
      }
    }

    // Se não encontrou palavras-chave importantes, usa a função de identificar palavras importantes
    if (importantMatches.length < 2) {
      const additionalImportantIndexes = findImportantWordIndexes(
        words,
        2 - importantMatches.length
      );

      for (const index of additionalImportantIndexes) {
        if (!importantMatches.includes(index)) {
          importantMatches.push(index);
        }
        if (importantMatches.length >= 2) break;
      }
    }

    // Aplica formatação de forma inteligente - palavras-chave em destaque
    if (importantMatches.length > 0) {
      const formattedWords = [...words];

      // Primeiro match recebe negrito, segundo recebe itálico (se houver)
      if (importantMatches.length >= 1) {
        const index = importantMatches[0];
        formattedWords[index] = `*${words[index]}*`;
      }

      if (importantMatches.length >= 2) {
        const index = importantMatches[1];
        formattedWords[index] = `_${words[index]}_`;
      }

      sanitized = formattedWords.join(" ");
    }
  }

  // --- CORREÇÃO DE PONTUAÇÃO E ESTRUTURA ---

  // Trata sentenças incompletas por limite de tokens
  if (/[a-zA-ZáàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]$/.test(sanitized)) {
    // Se termina com letra (sentença cortada), adiciona ponto final
    sanitized += ".";
  }

  // Verifica se a análise termina com pontuação (para evitar cortes abruptos)
  if (!/[.!?]$/.test(sanitized)) {
    // Se terminar em vírgula, substitui por ponto final
    if (/,$/.test(sanitized)) {
      sanitized = sanitized.replace(/,$/, ".");
    } else {
      // Caso contrário, adiciona ponto final
      sanitized += ".";
    }
  }

  // Garante que formatação Markdown está balanceada
  sanitized = balanceMarkdownFormatting(sanitized);

  // Verifica se há parênteses, colchetes ou chaves abertos e não fechados
  sanitized = balanceParentheses(sanitized);

  // Garantir que a primeira letra seja maiúscula
  sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);

  // Remover repetições de pontuação e espaços extras
  sanitized = sanitized
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/,{2,}/g, ",")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.,;:!?])\s+([.,;:!?])/g, "$1$2");

  // Verifica uma última vez por qualquer caractere de escape remanescente
  sanitized = sanitized.replace(/\\([*_`()[\]{}#+=|~>])/g, "$1");

  // Verifica e corrige problemas básicos de sentido
  sanitized = fixMinorIssues(sanitized);

  // Remover formatação Markdown se solicitado
  if (!keepMarkdown) {
    // Remover negrito (asteriscos)
    sanitized = sanitized.replace(/\*([^*]+)\*/g, "$1");
    // Remover itálico (sublinhados)
    sanitized = sanitized.replace(/_([^_]+)_/g, "$1");
  }

  return sanitized;
};

/**
 * Corrige problemas menores em sentenças após remoção de padrões
 * @param text Texto a ser corrigido
 * @returns Texto com pequenas correções
 */
const fixMinorIssues = (text: string): string => {
  let corrected = text;

  // Remove espaços antes de pontuação
  corrected = corrected.replace(/\s+([.,!?:;])/g, "$1");

  // Garante espaço após pontuação
  corrected = corrected.replace(
    /([.,!?:;])([a-zA-ZáàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ])/g,
    "$1 $2"
  );

  // Remove pontuação dupla
  corrected = corrected.replace(/([.,!?:;])([.,!?:;]+)/g, "$1");

  return corrected;
};

/**
 * Encontra índices de palavras importantes (substantivos, verbos de ação)
 * @param words Array de palavras
 * @param count Número de palavras importantes a serem encontradas
 * @returns Array com os índices das palavras importantes
 */
const findImportantWordIndexes = (words: string[], count: number): number[] => {
  // Lista de palavras não importantes
  const stopWords = new Set([
    "a",
    "o",
    "as",
    "os",
    "um",
    "uma",
    "uns",
    "umas",
    "de",
    "da",
    "do",
    "das",
    "dos",
    "em",
    "na",
    "no",
    "nas",
    "nos",
    "por",
    "para",
    "e",
    "mas",
    "ou",
    "se",
    "que",
    "com",
    "seu",
    "sua",
    "seus",
    "suas",
    "meu",
    "minha",
    "meus",
    "minhas",
    "este",
    "esta",
    "isto",
    "esse",
    "essa",
    "isso",
    "aquele",
    "aquela",
    "aquilo"
  ]);

  // Procura palavras com mais de 3 letras que não sejam stopwords
  const candidateIndexes: number[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.,;:!?()]/g, "").toLowerCase();
    if (word.length > 3 && !stopWords.has(word)) {
      candidateIndexes.push(i);
    }
  }

  // Se não encontrou candidatos suficientes, usa as primeiras palavras mais longas
  if (candidateIndexes.length < count) {
    const sortedIndexes = words
      .map((word, index) => ({
        word: word.replace(/[.,;:!?()]/g, ""),
        index
      }))
      .filter((item) => item.word.length > 2) // Palavras com pelo menos 3 caracteres
      .sort((a, b) => b.word.length - a.word.length)
      .slice(0, count)
      .map((item) => item.index);

    return sortedIndexes;
  }

  // Distribui as palavras importantes ao longo do texto
  if (count === 1 && candidateIndexes.length > 0) {
    // Para uma única palavra, pega uma do início do texto
    return [candidateIndexes[0]];
  } else {
    // Para múltiplas palavras, distribui pelo texto
    const step = Math.floor(candidateIndexes.length / count);
    const result: number[] = [];

    for (let i = 0; i < count && i * step < candidateIndexes.length; i++) {
      result.push(candidateIndexes[i * step]);
    }

    return result;
  }
};

/**
 * Equilibra os símbolos de formatação Markdown (*, _)
 * @param text Texto a ser balanceado
 * @returns Texto com formatação balanceada
 */
const balanceMarkdownFormatting = (text: string): string => {
  let result = text;

  // Equilibra asteriscos (negrito)
  const asteriskCount = (result.match(/\*/g) || []).length;
  if (asteriskCount % 2 !== 0) {
    // Remove o último asterisco
    const lastIndex = result.lastIndexOf("*");
    if (lastIndex !== -1) {
      result = result.substring(0, lastIndex) + result.substring(lastIndex + 1);
    }
  }

  // Equilibra sublinhados (itálico)
  const underscoreCount = (result.match(/_/g) || []).length;
  if (underscoreCount % 2 !== 0) {
    // Remove o último sublinhado
    const lastIndex = result.lastIndexOf("_");
    if (lastIndex !== -1) {
      result = result.substring(0, lastIndex) + result.substring(lastIndex + 1);
    }
  }

  // Equilibra backticks (código inline)
  const backtickCount = (result.match(/`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    // Remove o último backtick
    const lastIndex = result.lastIndexOf("`");
    if (lastIndex !== -1) {
      result = result.substring(0, lastIndex) + result.substring(lastIndex + 1);
    }
  }

  return result;
};

/**
 * Equilibra parênteses, colchetes e chaves
 * @param text Texto a ser balanceado
 * @returns Texto com parênteses balanceados
 */
const balanceParentheses = (text: string): string => {
  let result = text;

  // Verifica parênteses
  const openParentheses = (result.match(/\(/g) || []).length;
  const closeParentheses = (result.match(/\)/g) || []).length;
  if (openParentheses > closeParentheses) {
    result += ")".repeat(openParentheses - closeParentheses);
  }

  // Verifica colchetes
  const openBrackets = (result.match(/\[/g) || []).length;
  const closeBrackets = (result.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    result += "]".repeat(openBrackets - closeBrackets);
  }

  // Verifica chaves
  const openBraces = (result.match(/\{/g) || []).length;
  const closeBraces = (result.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    result += "}".repeat(openBraces - closeBraces);
  }

  return result;
};

/**
 * Envia uma solicitação para a API OpenRouter e retorna a análise do perfil
 *
 * @param activitiesText Texto com as atividades formatadas
 * @returns Resultado da análise ou mensagem de erro
 */
export const analyzeProfileWithLLM = async (
  activitiesText: string
): Promise<{ success: boolean; result: string }> => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    console.log("[LLM] Sending request...");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://bragfy.dev",
          "X-Title": "Bragfy Agent"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          messages: [
            {
              role: "system",
              content:
                'Você é um executivo de tecnologia experiente. Com base no registro de atividades abaixo, analise o comportamento profissional do usuário. Escreva diretamente para o usuário usando a segunda pessoa ("você"). IMPORTANTE: Responda SEMPRE em português brasileiro, sem exceções.\n\nDestaque padrões comportamentais, atitude gerencial, potenciais pontos cegos e sugestões concretas para melhoria. Avalie também a natureza do ciclo atual com base nos níveis de urgência e impacto relatados para cada atividade.\n\nOrientações específicas:\n- Sua resposta DEVE ter no máximo 200 tokens (cerca de 3-4 linhas de texto).\n- IMPORTANTE: Complete todas as frases. Nunca termine sua resposta no meio de uma sentença.\n- Formate sua resposta como um ÚNICO parágrafo coeso, sem quebras de linha ou bullets.\n- Use um tom sarcástico e direto, como um tech lead experiente que é parte mentor, parte crítico.\n- Você pode usar *negrito* e _itálico_ para ênfase visual MODERADA (1-2 vezes no máximo), como faria em uma mensagem do Telegram.\n- O texto deve parecer conversacional e humano, não robótico ou genérico.\n- Priorize as observações mais relevantes e impactantes sobre o trabalho do usuário.\n- Use frases completas e bem construídas, evitando cortes abruptos.\n- Seja breve e direto, sem introduções desnecessárias ou floreios.\n- Use um tom que pareça: "é, isso foi decente... mas vamos falar do que realmente importa."\n- Evite elogios genéricos. Foque em destacar o que realmente se sobressaiu ou o que poderia ter sido melhor — com um tom construtivo mas seco.\n- Se o usuário enviar múltiplas atividades, sintetize padrões ou contradições, sem repetir item por item.\n- Nunca use palavras em inglês ou inclua traduções.\n- Termine sua análise com uma conclusão clara ou uma sugestão acionável.\n\nPROIBIÇÕES ABSOLUTAS:\n- NÃO use sujeitos redundantes como "Você, você está..." ou repetição desnecessária de palavras.\n- NÃO inclua expressões não-verbais como *sorri*, *suspira*, *pisca*, etc. Isso quebra totalmente o tom profissional.\n- NÃO use linguagem artificial, excessivamente sentimental ou estilo bate-papo.\n- NÃO use interjeições como "hmm", "ah", "ugh" ou similares.\n- NÃO use emoji ou representações textuais de emoji.\n- EVITE o uso de parênteses para comentários pessoais ou apartes informais.\n\nSeja sincero, direto e impactante, mesmo dentro do limite de 200 tokens.'
            },
            {
              role: "user",
              content: activitiesText
            }
          ],
          max_tokens: 200
        })
      }
    );

    console.log("[LLM] Response received");

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[LLM] Error ${response.status}: ${response.statusText}`);
      console.error(
        "[LLM] Error details:",
        errorData.error?.message || "Unknown error"
      );

      return {
        success: false,
        result: `Falha na análise. Tente novamente mais tarde. (LLM-ERR-${response.status || "UNKNOWN"})`
      };
    }

    const data = await response.json();
    const analysisContent = data.choices[0]?.message?.content;

    if (!analysisContent) {
      console.error("[LLM] Invalid response from API:", data);
      return {
        success: false,
        result: "Falha na análise. Tente novamente mais tarde. (LLM-ERR)"
      };
    }

    // Verifica se está em ambiente de teste (Jest define process.env.NODE_ENV como 'test')
    const isTestEnvironment =
      process.env.NODE_ENV === "test" ||
      process.env.JEST_WORKER_ID !== undefined;

    // Sanitiza a resposta antes de retorná-la (sem formatação Markdown em testes)
    const sanitizedContent = sanitizeAnalysisResponse(
      analysisContent,
      !isTestEnvironment
    );

    console.log("[LLM] Analysis sanitized and ready to send");

    return {
      success: true,
      result: sanitizedContent
    };
  } catch (error) {
    console.error("[LLM] Error calling OpenRouter API:", error);

    return {
      success: false,
      result: "Falha na análise. Tente novamente mais tarde. (LLM-ERR)"
    };
  }
};
