// Configuração especial para testes
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      isolatedModules: true, // Isso desativa a verificação de tipos em tempo de execução
      tsconfig: "config/tsconfig.test.json" // Usar a configuração de TypeScript específica para testes
    }
  }
};
