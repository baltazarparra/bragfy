import { NlpManager } from "node-nlp";
import * as fs from "fs";
import * as path from "path";

// Singleton para garantir que o NlpManager seja carregado apenas uma vez
let nlpManagerInstance: NlpManager | null = null;

// Define um limite de confiança mais alto para comandos
const COMMAND_CONFIDENCE_THRESHOLD = 0.85;

// Caminho para o arquivo do modelo
const MODEL_PATH = path.resolve(process.cwd(), ".cache/nlu-model.nlp");

// Palavras-chave fortes que indicam comandos específicos de PDF
const PDF_STRONG_KEYWORDS = [
  "pdf",
  "documento pdf",
  "exportar pdf",
  "gerar pdf"
];
const PDF_KEYWORDS = [
  ...PDF_STRONG_KEYWORDS,
  "documento",
  "brag",
  "gerar",
  "exportar"
];

// Palavras-chave fortes que indicam comandos específicos de Brag Document
const BRAG_STRONG_KEYWORDS = [
  "brag",
  "brag document",
  "documento brag",
  "relatório"
];
const BRAG_KEYWORDS = [
  ...BRAG_STRONG_KEYWORDS,
  "documento",
  "relatório",
  "texto",
  "mostrar"
];

// Lista de palavras que indicam atividades pessoais/saúde/emoções e nunca devem ser classificadas como comandos
const ACTIVITY_DENYLIST = [
  // Saúde e corpo
  "dor",
  "doente",
  "médico",
  "consulta",
  "hospital",
  "remédio",
  "febre",
  "gripe",
  "resfriado",
  "abdomen",
  "cabeça",
  "braço",
  "perna",
  "costas",
  "dente",
  "garganta",
  "estômago",
  "saúde",
  "covid",
  "sintoma",
  "mal",
  "corpo",

  // Emoções e estados psicológicos
  "triste",
  "feliz",
  "ansioso",
  "ansiedade",
  "nervoso",
  "bravo",
  "irritado",
  "estressado",
  "cansado",
  "exausto",
  "animado",
  "deprimido",
  "preocupado",
  "chateado",
  "frustrado",

  // Atividades cotidianas
  "almoço",
  "jantar",
  "café",
  "comida",
  "comer",
  "beber",
  "dormir",
  "acordar",
  "banho",
  "sair",
  "chegar",
  "casa",
  "trabalho",
  "correndo",
  "caminhando",
  "academia",
  "exercício",
  "supermercado",
  "mercado",
  "shopping",
  "compras",
  "reunião",
  "ligação",
  "conversa",
  "ouvindo",
  "assistindo",
  "vendo",
  "jogando",
  "lendo",
  "escrevendo",
  "comprando",
  "vendendo",
  "visitando",
  "encontrando",
  "falando",
  "discutindo"
];

/**
 * Verifica se o modelo existe no disco
 */
function modelExists(): boolean {
  try {
    return fs.existsSync(MODEL_PATH);
  } catch (error) {
    console.error("[NLU] Erro ao verificar existência do modelo:", error);
    return false;
  }
}

/**
 * Inicializa e treina o gerenciador NLP
 */
export async function initNLU(): Promise<NlpManager> {
  if (nlpManagerInstance) {
    return nlpManagerInstance;
  }

  // Cria uma instância do NlpManager com configurações para português
  const manager = new NlpManager({
    languages: ["pt"],
    forceNER: true,
    nlu: { log: false }
  });

  // Verifica se já existe um modelo treinado
  if (modelExists()) {
    try {
      console.log("[NLU] Modelo encontrado, carregando do disco...");
      // @ts-ignore - o método load existe mas não está tipado corretamente
      await manager.load(MODEL_PATH);
      console.log("[NLU] Modelo carregado com sucesso!");
      nlpManagerInstance = manager;
      return manager;
    } catch (error) {
      console.error("[NLU] Erro ao carregar modelo do disco:", error);
      console.log("[NLU] Treinando novo modelo...");
    }
  } else {
    // Garante que o diretório .cache existe
    const cacheDir = path.dirname(MODEL_PATH);
    if (!fs.existsSync(cacheDir)) {
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
      } catch (error) {
        console.error("[NLU] Erro ao criar diretório cache:", error);
      }
    }
    console.log("[NLU] Inicializando e treinando o modelo NLU...");
  }

  // Treina para reconhecer intenção de gerar PDF com frases mais específicas
  manager.addDocument("pt", "gerar um pdf do brag", "generate_pdf");
  manager.addDocument("pt", "gerar pdf do brag", "generate_pdf");
  manager.addDocument("pt", "criar um pdf do brag document", "generate_pdf");
  manager.addDocument("pt", "criar pdf do documento", "generate_pdf");
  manager.addDocument("pt", "quero um pdf do meu brag", "generate_pdf");
  manager.addDocument("pt", "fazer um pdf do brag", "generate_pdf");
  manager.addDocument("pt", "exportar como pdf meu brag", "generate_pdf");
  manager.addDocument("pt", "converter para pdf meu documento", "generate_pdf");
  manager.addDocument("pt", "gerar arquivo pdf do brag", "generate_pdf");
  manager.addDocument("pt", "gerar PDF do documento", "generate_pdf");
  manager.addDocument("pt", "me dê um PDF", "generate_pdf");
  manager.addDocument("pt", "quero exportar meu brag para PDF", "generate_pdf");
  // Novas expressões para geração de PDF
  manager.addDocument("pt", "gerar meu documento", "generate_pdf");
  manager.addDocument("pt", "quero meu brag document", "generate_pdf");
  manager.addDocument("pt", "gerar documento", "generate_pdf");
  // Removida a entrada genérica "pdf" que causava falsos positivos

  // Treina para reconhecer intenção de gerar documento de texto
  manager.addDocument("pt", "gerar brag", "generate_brag_text");
  manager.addDocument("pt", "criar brag", "generate_brag_text");
  manager.addDocument("pt", "gerar documento", "generate_brag_text");
  manager.addDocument("pt", "brag document", "generate_brag_text");
  manager.addDocument("pt", "gerar texto", "generate_brag_text");
  manager.addDocument("pt", "exportar brag", "generate_brag_text");
  manager.addDocument("pt", "criar documento", "generate_brag_text");
  manager.addDocument("pt", "quero ver meu brag", "generate_brag_text");
  manager.addDocument("pt", "mostrar brag", "generate_brag_text");
  manager.addDocument("pt", "gerar brag document", "generate_brag_text");
  manager.addDocument("pt", "texto do brag", "generate_brag_text");
  manager.addDocument("pt", "mostre meu documento", "generate_brag_text");
  manager.addDocument(
    "pt",
    "quero ver minhas atividades em texto",
    "generate_brag_text"
  );
  // Novas expressões para resumo
  manager.addDocument("pt", "gerar resumo", "generate_brag_text");
  manager.addDocument("pt", "ver resumo", "generate_brag_text");
  manager.addDocument("pt", "gerar meu resumo", "generate_brag_text");
  manager.addDocument("pt", "me mostra meu resumo", "generate_brag_text");
  manager.addDocument(
    "pt",
    "resumo das minhas atividades",
    "generate_brag_text"
  );

  // Treina o modelo
  await manager.train();
  console.log("[NLU] Modelo treinado com sucesso!");

  // Salva o modelo treinado
  try {
    // @ts-ignore - o método save existe mas não está tipado corretamente
    await manager.save(MODEL_PATH);
    console.log(`[NLU] Modelo salvo em ${MODEL_PATH}`);
  } catch (error) {
    console.error("[NLU] Erro ao salvar modelo:", error);
  }

  nlpManagerInstance = manager;
  return manager;
}

/**
 * Interface para resultado da classificação NLU
 */
export interface NluResult {
  isMatch: boolean;
  confidence: number;
  intent: string | null;
}

/**
 * Conta quantas palavras-chave fortes de comando estão presentes na mensagem
 * @param message Mensagem a verificar
 * @param strongKeywords Lista de palavras-chave fortes
 * @returns Número de palavras-chave fortes encontradas
 */
function countStrongKeywords(
  message: string,
  strongKeywords: string[]
): number {
  const lowerMessage = message.toLowerCase();
  return strongKeywords.filter((kw) => lowerMessage.includes(kw)).length;
}

/**
 * Verifica se a mensagem contém palavras da lista de negação (denylist)
 * @param message Mensagem a verificar
 * @param denylist Lista de palavras a procurar
 * @returns true se alguma palavra da denylist for encontrada
 */
function containsDenylistedWords(message: string, denylist: string[]): boolean {
  const lowerMessage = message.toLowerCase();
  const words = lowerMessage.split(/\s+/).filter((w) => w.length > 0);

  // Verifica cada palavra da mensagem
  for (const word of words) {
    if (denylist.includes(word)) {
      return true;
    }
  }

  // Também verifica a presença de frases ou termos compostos da denylist
  return denylist.some(
    (term) => term.includes(" ") && lowerMessage.includes(term)
  );
}

/**
 * Verifica se a mensagem tem características suspeitas de falso positivo
 * @param message Mensagem a ser verificada
 * @param intent Intent detectada
 * @returns true se parece ser um falso positivo
 */
function isSuspiciousFalsePositive(message: string, intent: string): boolean {
  const lowerMessage = message.toLowerCase();
  const words = lowerMessage.split(/\s+/).filter((w) => w.length > 0);

  // Comandos específicos que devem ser sempre reconhecidos como válidos
  // (whitelist de frases exatas para comandos legítimos)
  const commandWhitelist = [
    "quero gerar um pdf do meu brag",
    "quero ver meu documento",
    "gerar pdf",
    "gerar brag",
    "mostrar brag",
    "criar brag document",
    "brag document",
    // Adicionando as variações do teste
    "gerar meu documento",
    "quero meu brag document",
    "gerar documento",
    "gerar resumo",
    "ver resumo",
    "gerar meu resumo",
    "me mostra meu resumo",
    "resumo das minhas atividades"
  ];

  // Se a mensagem está na whitelist, nunca a considere suspeita
  if (commandWhitelist.includes(lowerMessage)) {
    return false;
  }

  // Rejeitar mensagens que contêm palavras da denylist
  if (containsDenylistedWords(message, ACTIVITY_DENYLIST)) {
    return true;
  }

  // Determinar quais palavras-chave verificar com base na intent
  const keywordLists =
    intent === "generate_pdf"
      ? { strong: PDF_STRONG_KEYWORDS, regular: PDF_KEYWORDS }
      : intent === "generate_brag_text"
        ? { strong: BRAG_STRONG_KEYWORDS, regular: BRAG_KEYWORDS }
        : { strong: [], regular: [] };

  // Para mensagens curtas (menos de 5 palavras), exigir ao menos 2 palavras-chave fortes
  if (words.length < 5) {
    const strongKeywordCount = countStrongKeywords(
      message,
      keywordLists.strong
    );
    // Se tiver menos que 2 palavras-chave fortes, considerar falso positivo
    if (strongKeywordCount < 2) {
      return true;
    }
  } else {
    // Para mensagens longas, verificar se há pelo menos uma palavra-chave forte
    // ou duas palavras-chave regulares
    const hasStrongKeyword = keywordLists.strong.some((kw) =>
      lowerMessage.includes(kw)
    );
    const regularKeywordCount = keywordLists.regular.filter((kw) =>
      lowerMessage.includes(kw)
    ).length;

    if (!hasStrongKeyword && regularKeywordCount < 2) {
      return true;
    }
  }

  // Se passou por todas as verificações, não é suspeito
  return false;
}

/**
 * Identifica a intenção de uma mensagem do usuário
 * @param message Mensagem do usuário
 * @returns Objeto com a intenção identificada e pontuação de confiança, ou null se nenhuma intenção for identificada
 */
export async function classifyMessage(message: string): Promise<{
  intent: string;
  score: number;
  isFalsePositive?: boolean;
} | null> {
  const manager = await initNLU();

  try {
    // Processa a mensagem para identificar a intenção
    const result = await manager.process("pt", message);

    // Verifica se a intenção foi identificada
    if (result.intent && result.score > 0) {
      // Verifica se é um possível falso positivo
      if (isSuspiciousFalsePositive(message, result.intent)) {
        // Se a pontuação for alta, logs detalhados de rejeição
        if (result.score > 0.95) {
          console.log(
            `[NLU] High-score rejected: ${result.intent} for "${message}"`
          );
        } else {
          console.log(
            `[NLU] Falso positivo detectado para: "${message}" (intent: ${result.intent}, score: ${result.score.toFixed(2)})`
          );
        }

        // Retorna a intenção, mas marca como falso positivo
        return {
          intent: result.intent,
          score: result.score,
          isFalsePositive: true
        };
      }

      console.log(
        `[NLU] Intenção detectada: ${result.intent} (score: ${result.score.toFixed(2)})`
      );
      return {
        intent: result.intent,
        score: result.score,
        isFalsePositive: false
      };
    }

    console.log(`[NLU] Nenhuma intenção clara detectada para: "${message}"`);
    return null;
  } catch (error) {
    console.error("[NLU] Erro ao classificar mensagem:", error);
    return null;
  }
}

/**
 * Verifica se a mensagem indica uma solicitação de documento PDF
 * @returns Objeto contendo resultado da classificação e nível de confiança
 */
export async function isPdfRequest(message: string): Promise<NluResult> {
  const classification = await classifyMessage(message);

  // Whitelist específica para o PDF
  const pdfWhitelist = [
    "gerar meu documento",
    "quero meu brag document",
    "gerar documento"
  ];

  // Se estiver na whitelist, considere como match válido
  if (pdfWhitelist.includes(message.toLowerCase())) {
    return {
      isMatch: true,
      confidence: classification?.score || 1.0,
      intent: "generate_pdf"
    };
  }

  // Se for classificado como PDF, mas é um falso positivo
  if (
    classification?.intent === "generate_pdf" &&
    classification.isFalsePositive
  ) {
    return {
      isMatch: false, // Não é um match válido
      confidence: classification.score, // Mantém a confiança original
      intent: classification.intent // Mantém a intenção original
    };
  }

  // Segundo nível de proteção contra falsos positivos
  if (
    classification?.intent === "generate_pdf" &&
    classification.score > 0.95
  ) {
    // Caso a mensagem tenha alta confiança, mas contém palavras da denylist
    if (containsDenylistedWords(message, ACTIVITY_DENYLIST)) {
      console.log(`[NLU] High-score rejected: generate_pdf for "${message}"`);
      return {
        isMatch: false,
        confidence: classification.score,
        intent: classification.intent
      };
    }
  }

  return {
    isMatch:
      classification?.intent === "generate_pdf" &&
      (classification?.score || 0) >= COMMAND_CONFIDENCE_THRESHOLD &&
      !classification?.isFalsePositive, // Também verifica que não é um falso positivo
    confidence: classification?.score || 0,
    intent: classification?.intent || null
  };
}

/**
 * Verifica se a mensagem indica uma solicitação de Brag Document textual
 * @returns Objeto contendo resultado da classificação e nível de confiança
 */
export async function isBragTextRequest(message: string): Promise<NluResult> {
  const classification = await classifyMessage(message);

  // Whitelist específica para Brag Document
  const bragWhitelist = [
    "gerar resumo",
    "ver resumo",
    "gerar meu resumo",
    "me mostra meu resumo",
    "resumo das minhas atividades",
    "quero ver meu documento"
  ];

  // Se estiver na whitelist, considere como match válido
  if (bragWhitelist.includes(message.toLowerCase())) {
    return {
      isMatch: true,
      confidence: classification?.score || 1.0,
      intent: "generate_brag_text"
    };
  }

  // Se for classificado como Brag, mas é um falso positivo
  if (
    classification?.intent === "generate_brag_text" &&
    classification.isFalsePositive
  ) {
    return {
      isMatch: false, // Não é um match válido
      confidence: classification.score, // Mantém a confiança original
      intent: classification.intent // Mantém a intenção original
    };
  }

  // Segundo nível de proteção contra falsos positivos
  if (
    classification?.intent === "generate_brag_text" &&
    classification.score > 0.95
  ) {
    // Caso a mensagem tenha alta confiança, mas contém palavras da denylist
    if (containsDenylistedWords(message, ACTIVITY_DENYLIST)) {
      console.log(
        `[NLU] High-score rejected: generate_brag_text for "${message}"`
      );
      return {
        isMatch: false,
        confidence: classification.score,
        intent: classification.intent
      };
    }
  }

  return {
    isMatch:
      classification?.intent === "generate_brag_text" &&
      (classification?.score || 0) >= COMMAND_CONFIDENCE_THRESHOLD &&
      !classification?.isFalsePositive, // Também verifica que não é um falso positivo
    confidence: classification?.score || 0,
    intent: classification?.intent || null
  };
}
