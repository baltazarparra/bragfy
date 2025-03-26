// Script para testar a função extractTime
const { extractTime } = require("./src/utils/extractTime");

// Casos de teste solicitados
const testCases = [
  "Reunião às 10h",
  "Call com cliente às 15:30",
  "Almoço com parceiro 12h15",
  "Revisão do projeto"
];

testCases.forEach((message) => {
  const result = extractTime(message);
  console.log(`Original: '${message}'`);
  console.log(`Limpa: '${result.cleanMessage}'`);
  console.log(`Horário extraído: ${result.extractedTime ? "Sim" : "Não"}`);
  console.log("----------------------------");
});
