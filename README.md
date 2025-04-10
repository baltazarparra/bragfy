# Bragfy 🚀

Um agente do Telegram que ajuda profissionais a registrarem suas atividades diárias e gerarem um "Brag Document" em formato Markdown ou PDF.

## O que é um Brag Document?

Um Brag Document (ou "Documento de Conquistas") é uma prática recomendada para acompanhar suas atividades profissionais ao longo do tempo. Ele facilita:

- Avaliações de desempenho
- Solicitações de promoção
- Atualização de currículos e portfólios
- Reflexão sobre sua trajetória profissional

## Arquitetura

O Bragfy é um agente do Telegram que:

- Oferece interface amigável via Telegram
- Permite registrar atividades profissionais
- Facilita a categorização por urgência e impacto
- Gera documentos em formato Markdown diretamente no chat
- Exporta para PDF (em desenvolvimento)

## Funcionalidades

- **Interação simplificada**: Interface conversacional via Telegram
- **Registro de atividades**: Acompanhamento de realizações com categorização
- **Geração de Brag Document**: Em formato Markdown diretamente no chat
- **Exportação para PDF**: Para compartilhamento fácil (em desenvolvimento)

## Tecnologias

- TypeScript
- Node.js
- API do Telegram Bot
- Prisma para persistência de dados

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/bragfy.git
cd bragfy
```

2. Instale as dependências:

```bash
npm install
```

3. Configure o arquivo `.env`:

```
# Salt para geração de hash
BRAGFY_HASH_SALT="seu-salt-aqui"

# Token do Telegram (obtenha com @BotFather)
TELEGRAM_BOT_TOKEN="seu_token_do_bot_aqui"

# Ambiente
NODE_ENV="development"
```

## Executando o projeto

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm run build
npm start
```

## Fluxo do Usuário

1. O usuário interage com o agente via Telegram
2. Registra suas atividades profissionais
3. Fornece informações sobre urgência e impacto
4. Solicita a geração de um Brag Document
5. Recebe o documento em formato Markdown ou PDF

## Desenvolvimento Futuro

- Integração com calendário
- Suporte a múltiplos formatos de exportação
- Análise de tendências nas atividades
- Lembretes periódicos para registrar atividades

## Configuração

1. Clone o repositório
2. Copie o arquivo `.env.example` para `.env`
3. Configure as variáveis de ambiente no arquivo `.env`
4. Instale as dependências: `npm install`
5. Execute o projeto em desenvolvimento: `npm run dev`

## Variáveis de Ambiente

As seguintes variáveis de ambiente devem ser configuradas no arquivo `.env`:

- `DATABASE_URL`: URL de conexão com o banco de dados
- `TELEGRAM_BOT_TOKEN`: Token do bot do Telegram
- `NODE_ENV`: Ambiente de execução (development ou production)
- `OPENROUTER_API_KEY`: Chave da API OpenRouter

## Scripts

- `npm run dev`: Executa o projeto em desenvolvimento
- `npm run build`: Compila o projeto para produção
- `npm start`: Executa o projeto em produção
- `npm test`: Executa os testes
- `npm run db:migrate`: Cria migrations do banco de dados
- `npm run migrate:prod`: Aplica migrations no banco de dados de produção
- `npm run setup`: Executa a configuração inicial para produção

## Implantação no Render

Este projeto está configurado para implantação no [Render](https://render.com/).

Para mais detalhes sobre a implantação, consulte o arquivo [DEPLOYMENT.md](DEPLOYMENT.md).

## Configuração de Ambiente

### Ambiente de Desenvolvimento

1. Crie um arquivo `.env.development` com as seguintes variáveis:

```
DATABASE_URL="file:./prisma/dev.db"
TELEGRAM_BOT_TOKEN="seu-token-do-telegram"
NODE_ENV="development"
```

2. Execute o comando de setup:

```bash
npm run setup
```

Ou selecione o ambiente manualmente:

```bash
node setup.js
# Selecione "development" quando solicitado
```

### Ambiente de Produção

1. Crie ou atualize o arquivo `.env` com as seguintes variáveis:

```
DATABASE_URL="sua-url-do-postgresql"
TELEGRAM_BOT_TOKEN="seu-token-do-telegram"
NODE_ENV="production"
```

2. Execute o comando de setup:

```bash
NODE_ENV=production npm run setup
```

Ou selecione o ambiente manualmente:

```bash
node setup.js
# Selecione "production" quando solicitado
```

## Migração do Banco de Dados

### Inicialização do Banco de Dados (Primeira Vez)

Para inicializar o banco de dados pela primeira vez ou resetar completamente:

**Para desenvolvimento (SQLite):**

```bash
npm run db:init
```

**Para produção (PostgreSQL):**

```bash
npm run db:init:prod
```

Esse comando irá limpar o histórico de migrações existente, remover o banco de dados (SQLite, se for desenvolvimento) e criar uma nova migração inicial limpa.

### Migrações Subsequentes

Para criar ou atualizar migrações após a inicialização:

**Para desenvolvimento (SQLite):**

```bash
npm run db:migrate
```

**Para produção (PostgreSQL):**

```bash
npm run migrate:prod
```

**IMPORTANTE**: Nunca execute `prisma migrate dev` diretamente em ambiente de produção, pois isso pode causar erros de shadow database que requerem privilégios de superusuário.

### Mudança de Provedor de Banco de Dados

Se você estiver migrando de SQLite para PostgreSQL ou vice-versa, o Prisma não permite mesclar históricos de migração de diferentes provedores. Use os scripts de inicialização para essa situação:

**Para migrar para desenvolvimento (SQLite):**

```bash
npm run db:init
```

**Para migrar para produção (PostgreSQL):**

```bash
npm run db:init:prod
```

Esses comandos farão o reset completo do banco de dados, garantindo que o histórico de migrações seja consistente com o provedor utilizado.

## Arquivos de Schema do Prisma

O projeto usa diferentes arquivos de schema para diferentes ambientes:

- `prisma/schema.prisma` - Schema para ambiente de produção (PostgreSQL)
- `prisma/schema.development.prisma` - Schema para ambiente de desenvolvimento (SQLite)

Os scripts `scripts/prisma-migrate.js` e `scripts/init-database.js` gerenciam automaticamente qual schema deve ser usado com base no ambiente.

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor em modo de desenvolvimento
- `npm run build`: Compila o projeto
- `npm start`: Inicia o servidor em modo de produção
- `npm run db:init`: Inicializa o banco de dados de desenvolvimento (SQLite) do zero
- `npm run db:init:prod`: Inicializa o banco de dados de produção (PostgreSQL) do zero
- `npm run db:migrate`: Executa migrações em ambiente de desenvolvimento
- `npm run migrate:prod`: Aplica migrações em ambiente de produção
- `npm run setup`: Configura o ambiente baseado na seleção do usuário

## Segurança de Migração do Prisma

Este projeto implementa um fluxo seguro de migração do Prisma:

- **Desenvolvimento**: Usa SQLite com `migrate dev`
- **Produção**: Usa PostgreSQL com `migrate deploy`

Os scripts garantem que:

- `migrate dev` só seja executado em ambiente de desenvolvimento
- `migrate deploy` seja executado em produção
- Uma verificação de segurança impeça a execução acidental de `migrate dev` em produção
- O schema correto seja usado temporariamente durante as migrações
