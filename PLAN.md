# Bragfy - Plano de Desenvolvimento

Um assistente de Brag Document no Telegram, desenvolvido com Cursor + Claude 3.7.

## Status do Projeto

### ✅ Recursos Implementados

- **Registro de usuário**

  - Cadastro via comando `/start`
  - Suporte a deep links com origem (ex: `?start=instagram`)
  - Armazenamento seguro no banco de dados

- **Gestão de atividades**

  - Registro via mensagens de texto diretas
  - Interface interativa com botões inline
  - Confirmação, edição ou cancelamento
  - Armazenamento com ID único e timestamp formatado
  - Feedback claro para cada ação do usuário

- **Geração de Brag Document**

  - Múltiplos gatilhos de texto (`/brag`, `/bragfy`, `gerar brag`, etc.)
  - Opções de período via botões inline (hoje, 7 dias, 30 dias)
  - Formatação em tabela Markdown com cabeçalho de usuário
  - Escape de caracteres especiais para compatibilidade
  - Tratamento de casos sem atividades
  - Verificação de usuário e tratamento de erros

- **Infraestrutura**
  - ORM Prisma configurado
  - Ambiente de desenvolvimento com SQLite
  - Modelos de dados relacionais (User-Activity)
  - Handlers modularizados para comandos e callbacks
  - Feedback de erro consistente em todos os casos
  - Tratamento defensivo de dados de usuário

### 🚧 Próximos Passos

- **Edição de atividades**

  - Implementar fluxo completo de edição
  - Histórico de versões (opcional)

- **Visualização avançada**

  - Paginação para listas extensas
  - Filtros adicionais (categorias, tags)

- **Geração de documentos**
  - Exportação para PDF a partir do Markdown
  - Layout profissional e customizável
  - Possibilidade de compartilhamento direto

### 🔮 Visão de Longo Prazo

- Suporte a múltiplos idiomas
- Exportação em formatos alternativos (CSV)
- Classificação de atividades por categoria
- Integração com WhatsApp via Meta API

## 🧠 UX — Experiência do Usuário

### Jornada do Usuário

**Ao abrir o bot:**

- Tentamos recuperar seus dados via API do Telegram
- Se não for possível, pedimos o comando `/start` para obter informações básicas

**Se for um novo usuário:**

- Salvamos seus dados no banco (nome, username, ID)
- Apresentamos o bot e suas funcionalidades

**Se for um usuário existente:**

- Mostramos mensagem de boas-vindas de retorno
- Reexibimos as instruções de uso para fácil referência

**Ao enviar uma mensagem:**

- Perguntamos se quer editar, cancelar ou confirmar o conteúdo
- Ao confirmar, solicitamos informações adicionais sobre urgência e impacto em mensagens separadas
- Após preenchimento, salvamos a atividade com timestamp e detalhes

**Para gerar um relatório:**

- O usuário pode usar comandos como `/brag` ou frases como "**gerar brag**"
- Mostramos três opções de período (hoje, 7 dias, 30 dias) - sem emojis
- Ao selecionar, geramos um documento Markdown simplificado com nome e atividades
- Se não houver atividades, apresentamos feedback e sugestão

## 🛠 DX — Experiência do Desenvolvedor

### Stack Técnica

- **Linguagem**: TypeScript
- **Runtime**: Node.js
- **Bot**: API Telegram Bot
- **ORM**: Prisma
- **Banco de Dados**: SQLite (dev) / PostgreSQL (prod)
- **Testes**: Jest + ts-jest
- **Qualidade**: ESLint + Prettier
- **CI/CD**: GitHub Actions (futuro)
- **PDF**: (a definir: pdf-lib ou puppeteer)

### Arquitetura

```
/src
├── bot/
│   ├── commands.ts     # Handlers de comandos
│   └── index.ts        # Configuração do bot
├── db/
│   └── client.ts       # Cliente Prisma
├── utils/
│   ├── userUtils.ts    # Funções relacionadas a usuários
│   └── activityUtils.ts # Funções relacionadas a atividades
└── main.ts             # Ponto de entrada da aplicação
```

### Padrões de Código

- **Modularização**: Cada arquivo tem uma responsabilidade clara
- **Tipagem**: TypeScript com tipos estritos
- **Tratamento de erros**: Try/catch em todas as operações assíncronas
- **Logs**: Console.log/warn/error para depuração e monitoramento
- **Comentários**: JSDoc para funções principais
- **Formatação**: Prettier para estilo consistente
- **Linting**: ESLint para qualidade de código
- **Testes**: Unitários para funções e mock para handlers

## 🤖 AX — Experiência do Assistente (BOT)

- Detecta comandos e frases-chave ("gerar brag", "gerar relatório")
- Interface com botões inline sempre que possível
- Feedback claro para cada ação (sucesso, erro, vazio)
- Mensagens formatadas com Markdown para melhor legibilidade
- Timestamps em formato legível (dd/mm/yyyy hh:mm:ss)
- Escape de caracteres especiais para evitar problemas de formatação
- Botões para navegação intuitiva
