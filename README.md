# Bragfy 🚀

Um bot do Telegram que ajuda usuários a registrar atividades profissionais e gerar um Brag Document em formato PDF.

## Funcionalidades

- Registro de atividades profissionais via Telegram
- Armazenamento seguro das atividades
- Geração de documento PDF organizado
- Interface amigável e intuitiva

## Tecnologias

- TypeScript
- Node.js
- Prisma ORM (PostgreSQL para produção, SQLite para desenvolvimento)
- API do Telegram Bot

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
# Banco de dados
DATABASE_URL="file:./dev.db" # SQLite para desenvolvimento

# Telegram
TELEGRAM_BOT_TOKEN="seu_token_do_bot_aqui" # Obtenha com @BotFather no Telegram

# Ambiente
NODE_ENV="development"
```

4. Execute as migrações do banco de dados:

```bash
npm run prisma:migrate
```

5. Gere o cliente Prisma:

```bash
npm run prisma:generate
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

## Uso

1. Abra o chat com o bot no Telegram
2. Envie o comando `/start` para começar
3. Siga as instruções para registrar suas atividades profissionais
4. Use o comando `/generate` para gerar seu Brag Document em PDF

## Licença

Este projeto está licenciado sob a licença ISC.
