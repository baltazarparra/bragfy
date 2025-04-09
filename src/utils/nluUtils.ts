import { NlpManager } from "node-nlp";

// Singleton para garantir que o NlpManager seja carregado apenas uma vez
let nlpManagerInstance: NlpManager | null = null;

/**
 * Inicializa e treina o gerenciador NLP
 */
export async function initNLU(): Promise<NlpManager> {
  if (nlpManagerInstance) {
    return nlpManagerInstance;
  }

  console.log("[NLU] Inicializando e treinando o modelo NLU...");

  // Cria uma instância do NlpManager com configurações para português
  const manager = new NlpManager({
    languages: ["pt"],
    forceNER: true,
    nlu: { log: false }
  });

  // Treina para reconhecer intenção de gerar PDF
  manager.addDocument("pt", "gerar um pdf", "generate_pdf");
  manager.addDocument("pt", "gerar pdf", "generate_pdf");
  manager.addDocument("pt", "criar um pdf", "generate_pdf");
  manager.addDocument("pt", "criar pdf", "generate_pdf");
  manager.addDocument("pt", "quero um pdf", "generate_pdf");
  manager.addDocument("pt", "fazer um pdf", "generate_pdf");
  manager.addDocument("pt", "exportar como pdf", "generate_pdf");
  manager.addDocument("pt", "converter para pdf", "generate_pdf");
  manager.addDocument("pt", "gerar arquivo pdf", "generate_pdf");
  manager.addDocument("pt", "pdf", "generate_pdf");
  manager.addDocument("pt", "gerar PDF", "generate_pdf");

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

  // Treina o modelo
  await manager.train();
  console.log("[NLU] Modelo treinado com sucesso!");

  nlpManagerInstance = manager;
  return manager;
}

/**
 * Identifica a intenção de uma mensagem do usuário
 * @param message Mensagem do usuário
 * @returns Objeto com a intenção identificada e pontuação de confiança, ou null se nenhuma intenção for identificada
 */
export async function classifyMessage(message: string): Promise<{
  intent: string;
  score: number;
} | null> {
  const manager = await initNLU();

  try {
    // Processa a mensagem para identificar a intenção
    const result = await manager.process("pt", message);

    // Verifica se a intenção foi identificada com confiança suficiente
    if (result.intent && result.score > 0.65) {
      console.log(
        `[NLU] Intenção detectada: ${result.intent} (score: ${result.score.toFixed(2)})`
      );
      return {
        intent: result.intent,
        score: result.score
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
 */
export async function isPdfRequest(message: string): Promise<boolean> {
  const classification = await classifyMessage(message);
  return classification?.intent === "generate_pdf";
}

/**
 * Verifica se a mensagem indica uma solicitação de Brag Document textual
 */
export async function isBragTextRequest(message: string): Promise<boolean> {
  const classification = await classifyMessage(message);
  return classification?.intent === "generate_brag_text";
}
