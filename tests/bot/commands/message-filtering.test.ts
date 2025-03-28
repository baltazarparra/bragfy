import { handleNewChat, onboardingInProgress } from "../../../src/bot/commands";
import {
  createMockBot,
  createMessage,
  mockExistingUser,
  mockNewUser,
  setupMocksBeforeEach,
  mocks
} from "../setup";

describe("Filtragem de Mensagens", () => {
  let mockBot: any;
  let existingUser: any;

  beforeEach(() => {
    setupMocksBeforeEach();
    mockBot = createMockBot();
    existingUser = mockExistingUser(123456789);
    // Limpar estado de onboarding
    onboardingInProgress.delete(123456789);
  });

  describe("Mensagens de bots", () => {
    it("deve ignorar mensagens enviadas por bots", async () => {
      // Arrange
      const msg = createMessage(123456789, 123456789, "Mensagem de bot");
      // Define que a mensagem veio de um bot
      if (msg.from) {
        msg.from.is_bot = true;
      }

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      // Não deve chamar nenhum dos métodos de interação com o usuário
      expect(mocks.userExists).not.toHaveBeenCalled();
      expect(mockBot.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("Mensagens durante onboarding", () => {
    it("deve pedir para aguardar quando o onboarding estiver em andamento", async () => {
      // Arrange
      const msg = createMessage(
        123456789,
        123456789,
        "Mensagem durante onboarding"
      );
      // Marca que o onboarding está em andamento
      onboardingInProgress.set(123456789, true);

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Estamos finalizando seu cadastro")
      );
      // Não deve verificar usuário nem prosseguir
      expect(mocks.userExists).not.toHaveBeenCalled();
    });
  });

  describe("Mensagens sem dados de usuário", () => {
    it("deve solicitar /start quando a mensagem não tem dados do usuário", async () => {
      // Arrange
      const msg = createMessage(123456789, 123456789, "Mensagem sem from");
      msg.from = undefined;

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Não foi possível obter suas informações")
      );
      expect(mocks.userExists).not.toHaveBeenCalled();
    });
  });

  describe("Mensagens de usuários não cadastrados", () => {
    it("deve solicitar /start quando o usuário não estiver cadastrado", async () => {
      // Arrange
      const msg = createMessage(
        123456789,
        123456789,
        "Mensagem de usuário não cadastrado"
      );

      // Reconfigurar os mocks para o cenário de usuário não cadastrado
      setupMocksBeforeEach();
      (mocks.userExists as jest.Mock).mockResolvedValue(false);

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Opa! Parece que tivemos um problema")
      );
    });
  });

  describe("Inconsistências de banco", () => {
    it("deve tratar inconsistência quando userExists retorna true mas getUserByTelegramId retorna null", async () => {
      // Arrange
      const msg = createMessage(
        123456789,
        123456789,
        "Mensagem com inconsistência"
      );

      // Reconfigurar os mocks para o cenário de inconsistência
      setupMocksBeforeEach();
      (mocks.userExists as jest.Mock).mockResolvedValue(true);
      (mocks.getUserByTelegramId as jest.Mock).mockResolvedValue(null);

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining("Opa! Parece que tivemos um problema")
      );
    });
  });

  describe("Tratamento de erros inesperados", () => {
    it("deve tratar erros inesperados durante o processamento de mensagens", async () => {
      // Arrange
      const msg = createMessage(123456789, 123456789, "Mensagem que gera erro");

      // Reconfigurar os mocks para o cenário de erro
      setupMocksBeforeEach();
      // Simula um erro na verificação de existência do usuário
      (mocks.userExists as jest.Mock).mockRejectedValue(
        new Error("Erro de banco")
      );

      // Act
      await handleNewChat(mockBot, msg);

      // Assert
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining(
          "Ops! Ocorreu um erro ao processar sua mensagem"
        )
      );
    });
  });
});
