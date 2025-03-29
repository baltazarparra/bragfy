# Bragfy - Plano de Desenvolvimento

Um assistente de Brag Document no Telegram que ajuda profissionais a registrar e organizar suas realizações.

## Arquitetura

O projeto Bragfy é um bot do Telegram desenvolvido com:

- Node.js + TypeScript
- Biblioteca `node-telegram-bot-api`
- Prisma ORM para persistência de dados
- Interface de usuário conversacional

## Fluxo de Operação

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│   Usuário   │────▶│  Bot Bragfy │────▶│  Documento  │
│  Telegram   │     │             │     │  Markdown   │
│             │     │             │     │    ou PDF   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Status do Projeto

### ✅ Recursos Implementados

- Configuração básica do bot do Telegram
- Estrutura de dados para usuários e atividades
- Integração com Prisma ORM
- Sistema de tipos em TypeScript

### 🚧 Próximos Passos

- Fluxo de onboarding para novos usuários
- Registro de atividades profissionais
- Categorização por urgência e impacto
- Geração de documentos em Markdown
- Exportação para PDF
- Tratamento de erros robusto

### 🔮 Visão de Longo Prazo

- **Armazenamento Avançado**: Migração para banco de dados em nuvem
- **Análise de Dados**: Insights sobre padrões de atividades
- **Integrações**: Com calendários e ferramentas de produtividade
- **Recursos Avançados**: Templates personalizados para diferentes setores profissionais

## 🧠 UX — Experiência do Usuário

### Jornada do Usuário

**Ao abrir o bot:**

- Tentamos recuperar seus dados via API do Telegram
- Apresentamos a funcionalidade do bot para novos usuários

**Se for um novo usuário:**

- Salvamos seus dados no banco (nome, username, ID)
- Apresentamos o bot e suas funcionalidades

**Se for um usuário existente:**

- Mostramos mensagem de boas-vindas de retorno
- Exibimos as instruções de uso para fácil referência

**Ao enviar uma mensagem:**

- Perguntamos se quer editar, cancelar ou confirmar o conteúdo
- Ao confirmar, solicitamos informações adicionais sobre urgência e impacto
- Após preenchimento, salvamos a atividade com timestamp e detalhes

**Para gerar um relatório:**

- O usuário solicita a geração de um documento
- Mostramos três opções de período (hoje, 7 dias, 30 dias)
- Ao selecionar, geramos um documento Markdown com nome e atividades
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

- Interface de chat intuitiva
- Feedback claro para cada ação (sucesso, erro, vazio)
- Mensagens formatadas com Markdown para melhor legibilidade
- Timestamps em formato legível (dd/mm/yyyy hh:mm:ss)
- Escape de caracteres especiais para evitar problemas de formatação
- Botões para navegação intuitiva
- Stickers personalizados em momentos-chave de interação:
  - Onboarding (boas-vindas para novos usuários e retornantes)
  - Confirmação de registro de atividade
  - Geração de Brag Document (Markdown e PDF)

## 🖼️ Sistema de Stickers

### Implementação Atual

- **Módulo Dedicado**: Implementação através do arquivo `src/utils/stickerUtils.ts`
- **Tipos de Interação**: Suporte para 3 contextos principais:
  - `onboarding`: Enviados quando um usuário inicia o bot (novo ou retornante)
  - `new_activity`: Enviados quando uma atividade é registrada com sucesso
  - `brag`: Enviados quando um Brag Document é gerado (Markdown ou PDF)
- **Seleção Aleatória**: Para cada interação, um sticker é escolhido aleatoriamente de um conjunto predefinido
- **Testes**: Cobertura completa através de testes unitários:
  - `tests/utils/stickerUtils.test.ts`: Verifica a funcionalidade base
  - `tests/bot/commands/stickers.test.ts`: Testa a integração com o bot

### Extensibilidade

Para adicionar ou modificar stickers:

1. Localize o objeto `stickers` no arquivo `src/utils/stickerUtils.ts`
2. Adicione novos IDs de stickers ao array correspondente ao tipo de interação
3. Para obter IDs de novos stickers, envie-os para o bot [@getidsbot](https://t.me/getidsbot) no Telegram
4. Execute os testes para garantir que tudo funciona corretamente
