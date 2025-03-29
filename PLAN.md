# Bragfy - Plano de Desenvolvimento

Um assistente de Brag Document no Telegram com funcionalidade de compartilhamento via link.

## Arquitetura

O projeto Bragfy é dividido em duas partes independentes:

### 1. Bot do Telegram (este repositório)

- Desenvolvimento em Node.js + TypeScript
- Utiliza a biblioteca `node-telegram-bot-api`
- Integração com APIs externas via Axios
- Interface de usuário baseada em comandos e botões inline
- Modo de simulação para desenvolvimento sem token do Telegram
- Geração de Brag Documents em formato Markdown

### 2. Webapp Viewer (repositório separado)

- Desenvolvimento em Next.js 14 (App Router)
- Serviços de API para receber documentos do bot
- Armazenamento estático de documentos HTML
- Roteamento dinâmico para acessar documentos via `/u/[hash]`

## Fluxo de Integração

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│   Usuário   │────▶│  Bot Bragfy │────▶│ API Viewer  │
│  Telegram   │     │             │     │             │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                       │
       │                                       │
       │                                       ▼
       │                               ┌─────────────┐
       │                               │             │
       └───────────────────────────────│  HTML Page  │
                                       │             │
                                       └─────────────┘
```

## Status do Projeto

### ✅ Recursos Implementados

**Bot do Telegram:**

- Comando `/start` para iniciar o bot
- Comando `/brag` para gerar Brag Document
- Interface com botões inline
- Geração de hash para link seguro
- Envio de documento via POST para a API
- Modo de simulação para desenvolvimento local
- Log de eventos e depuração
- Tratamento de erros robusto

**API e Visualização:**

- Endpoint POST `/api/publish` para receber documentos
- Armazenamento estático em `/public/generated`
- Rota dinâmica `/u/[hash]` para acessar documentos
- Validação de dados de entrada
- Página 404 customizada para documentos não encontrados

### 🚧 Próximos Passos

**Bot do Telegram:**

- Exportação para PDF
- Autenticação e autorização avançadas
- Configurações personalizadas por usuário
- Suporte a edição de documentos existentes
- Comandos adicionais de utilidade

**API e Visualização:**

- Layout e design responsivo avançado
- Temas personalizáveis
- Proteção por senha para documentos
- Analytics de visualização
- Pré-renderização para melhor SEO
- Compatibilidade com dispositivos móveis melhorada

### 🔮 Visão de Longo Prazo

- **Armazenamento Avançado**: Migração para Supabase ou Firebase
- **Versão Enterprise**: Com recursos para times e organizações
- **Plataforma Multi-idioma**: Suporte a múltiplos idiomas
- **Integrações**: Com GitHub, LinkedIn e outras plataformas
- **API Pública**: Para integração com outros serviços

## Modelo de Comunicação

### Bot → API

O bot envia um POST para o endpoint `/api/publish` com o seguinte formato:

```json
{
  "hash": "string", // Hash gerado a partir do ID do usuário
  "html": "string" // Conteúdo HTML do documento formatado
}
```

### API → Usuário

A API responde com:

```json
{
  "success": true,
  "url": "/u/hash123",
  "message": "Documento publicado com sucesso"
}
```

## Vantagens da Arquitetura Atual

1. **Desacoplamento**: Bot e viewer podem ser desenvolvidos e escalados independentemente
2. **Simplicidade**: Cada componente tem uma responsabilidade clara e bem definida
3. **Flexibilidade**: Possibilidade de substituir componentes ou adicionar novos sem afetar os existentes
4. **Deployment**: Cada componente pode ser hospedado em plataformas diferentes (ex: bot em VPS, webapp no Vercel)
5. **Segurança**: Separação de responsabilidades reduz vetores de ataque

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
