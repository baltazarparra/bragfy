// Arquivo de definição de tipos específico para testes
import { jest } from "@jest/globals";

// Estende a definição de jest.fn() para evitar erros de tipagem com mocks
declare module "@jest/globals" {
  namespace jest {
    // Sobrescreve o comportamento de fn() para aceitar qualquer valor de retorno
    function fn<T = any>(
      implementation?: (...args: any[]) => T
    ): jest.Mock<T, any[]>;

    // Adiciona método mock
    function mock(moduleName: string, factory?: () => unknown): typeof jest;
    function clearAllMocks(): typeof jest;

    // Adiciona método requireActual
    function requireActual(moduleName: string): any;
  }
}
