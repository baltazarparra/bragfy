import {
  handleStartCommand,
  onboardingInProgress,
  pinnedInstructionsStatus
} from "../../../src/bot/commands";
import {
  createMockBot,
  createMessage,
  mockNewUser,
  mockExistingUser,
  setupMocksBeforeEach,
  mocks
} from "../setup";

describe("Testes de Onboarding", () => {
  let mockBot: any;

  beforeEach(() => {
    setupMocksBeforeEach();
    mockBot = createMockBot();

    // Garantir que o estado de onboarding esteja limpo
    onboardingInProgress.clear();
  });

  it("deve enviar mensagem de erro quando não há dados do usuário", async () => {
    // Arrange
    const msg = createMessage(123456789, 123456789, "/start");
    msg.from = undefined;

    // Act
    await handleStartCommand(mockBot, msg);

    // Assert
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      123456789,
      expect.stringContaining(
        "Não foi possível obter suas informações. Por favor, tente novamente."
      )
    );
    expect(mocks.userExists).not.toHaveBeenCalled();
    expect(onboardingInProgress.get(123456789)).toBeUndefined();
  });

  it("deve enviar mensagem de boas-vindas para usuário existente", async () => {
    // Arrange
    const msg = createMessage(123456789, 123456789, "/start");
    const existingUser = mockExistingUser(123456789);

    // Resetar contadores de chamadas
    jest.clearAllMocks();

    // Mock para onboardingInProgress
    onboardingInProgress.set(123456789, true);

    // Act
    await handleStartCommand(mockBot, msg);

    // Assert
    // Como userExists retorna true, o onboarding deve ser finalizado
    expect(onboardingInProgress.has(123456789)).toBeFalsy();
    expect(mocks.createUser).not.toHaveBeenCalled();

    // Verifica que apenas um sticker foi enviado - via sendStickerSafely
    expect(mocks.sendStickerSafely).toHaveBeenCalledTimes(1);
    expect(mocks.sendStickerSafely).toHaveBeenCalledWith(
      expect.anything(),
      123456789,
      "onboarding"
    );

    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      1,
      123456789,
      "⏳ Carregando seus dados..."
    );

    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      2,
      123456789,
      "Olá novamente, João! Você já está cadastrado no Bragfy."
    );

    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      3,
      123456789,
      expect.stringContaining("*COMO USAR*:"),
      expect.objectContaining({ parse_mode: "Markdown" })
    );
  });

  it("deve criar usuário e enviar mensagem para novo usuário", async () => {
    // Arrange
    const msg = createMessage(123456789, 123456789, "/start");
    const newUser = mockNewUser(123456789);

    // Resetar contadores de chamadas
    jest.clearAllMocks();

    // Mock para onboardingInProgress
    onboardingInProgress.set(123456789, true);

    // Mock para pinnedInstructionsStatus para forçar envio de instruções
    jest.spyOn(pinnedInstructionsStatus, "get").mockReturnValueOnce(false);

    // Configurar mockBot para retornar valores para mensagens enviadas
    mockBot.sendMessage.mockResolvedValueOnce({ message_id: 1001 });
    mockBot.sendMessage.mockResolvedValueOnce({ message_id: 1002 });

    // Act
    await handleStartCommand(mockBot, msg);

    // Assert
    expect(mocks.createUser).toHaveBeenCalledWith(msg.from);

    // Verifica que apenas um sticker foi enviado - via sendStickerSafely
    expect(mocks.sendStickerSafely).toHaveBeenCalledTimes(1);
    expect(mocks.sendStickerSafely).toHaveBeenCalledWith(
      expect.anything(),
      123456789,
      "onboarding"
    );

    expect(mockBot.sendMessage).toHaveBeenCalledTimes(3);
    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      1,
      123456789,
      "⏳ Registrando seu usuário..."
    );

    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      2,
      123456789,
      expect.stringContaining("Olá *João*, boas vindas ao *Bragfy*"),
      expect.objectContaining({ parse_mode: "Markdown" })
    );

    // Segunda mensagem com instruções
    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      3,
      123456789,
      expect.stringContaining("*COMO USAR*:"),
      expect.any(Object)
    );
    // Verifica que o onboarding é finalizado
    expect(onboardingInProgress.has(123456789)).toBeFalsy();
  });

  it("deve incluir a fonte na mensagem de boas-vindas", async () => {
    // Arrange
    const msg = createMessage(123456789, 123456789, "/start from=share");
    const newUser = mockNewUser(123456789);

    // Act
    await handleStartCommand(mockBot, msg);

    // Assert
    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      1,
      123456789,
      "⏳ Registrando seu usuário..."
    );

    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      2,
      123456789,
      expect.stringContaining("Olá *João*, boas vindas ao *Bragfy*"),
      expect.objectContaining({ parse_mode: "Markdown" })
    );
  });

  it("deve lidar com erro durante o processamento", async () => {
    // Arrange
    const msg = createMessage(123456789, 123456789, "/start");

    // Força um erro ao verificar usuário
    (mocks.userExists as jest.Mock).mockRejectedValue(
      new Error("Erro de banco")
    );

    // Act
    await handleStartCommand(mockBot, msg);

    // Assert
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      123456789,
      expect.stringContaining(
        "Ocorreu um erro ao processar seu comando. Por favor, tente novamente mais tarde."
      )
    );
    // Verifica que o onboarding é finalizado mesmo com erro
    expect(onboardingInProgress.get(123456789)).toBeFalsy();
  });

  it("deve enviar mensagem de boas-vindas formatada corretamente para novos usuários", async () => {
    // Arrange
    const msg = createMessage(123456789, 123456789, "/start");
    const newUser = mockNewUser(123456789);

    // Act
    await handleStartCommand(mockBot, msg);

    // Assert
    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      1,
      123456789,
      "⏳ Registrando seu usuário..."
    );

    expect(mockBot.sendMessage).toHaveBeenNthCalledWith(
      2,
      123456789,
      `Olá *João*, boas vindas ao *Bragfy*,  
seu agente pessoal para gestão de Brag Documents`,
      expect.objectContaining({ parse_mode: "Markdown" })
    );
  });

  it("deve garantir que as instruções sejam fixadas apenas uma vez por usuário", async () => {
    // Arrange
    const msg = createMessage(123456789, 123456789, "/start");
    const newUser = mockNewUser(123456789);

    // Configura status do pin como não fixado
    jest.spyOn(pinnedInstructionsStatus, "get").mockReturnValueOnce(false);

    // Configura resposta do bot para simular mensagem enviada
    mockBot.sendMessage.mockResolvedValueOnce({ message_id: 1001 });
    mockBot.sendMessage.mockResolvedValueOnce({ message_id: 1002 });

    // Act
    await handleStartCommand(mockBot, msg);

    // Assert - Verificar que pinChatMessage foi chamado na primeira vez
    expect(mockBot.pinChatMessage).toHaveBeenCalled();

    // Resetar mocks para o segundo teste
    mockBot = createMockBot();

    // Segunda vez - configura status do pin como já fixado
    jest.spyOn(pinnedInstructionsStatus, "get").mockReturnValueOnce(true);

    // Segunda vez não deve fixar novamente
    await handleStartCommand(mockBot, msg);

    // Não deve tentar fixar de novo se já estiver fixado
    expect(mockBot.pinChatMessage).not.toHaveBeenCalled();
  });

  it("deve continuar o onboarding mesmo se ocorrer erro ao fixar mensagem", async () => {
    // Arrange
    const msg = createMessage(123456789, 123456789, "/start");
    const newUser = mockNewUser(123456789);

    // Configura resposta do bot para simular mensagem enviada
    mockBot.sendMessage.mockResolvedValueOnce({ message_id: 1001 });
    mockBot.sendMessage.mockResolvedValueOnce({ message_id: 1002 });

    // Força um erro ao fixar a mensagem
    mockBot.pinChatMessage.mockRejectedValue(
      new Error("Não foi possível fixar")
    );

    // Act
    await handleStartCommand(mockBot, msg);

    // Assert
    // Verificar que onboarding foi concluído mesmo com erro
    expect(onboardingInProgress.get(123456789)).toBeFalsy();
  });
});
