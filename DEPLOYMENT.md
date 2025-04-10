# Implantação do Bragfy no Render

Este documento contém instruções para implantar o projeto Bragfy no [Render](https://render.com/).

## Pré-requisitos

1. Conta no Render
2. Banco de dados PostgreSQL já criado no Render

## Configuração

### Arquivo .env

O projeto utiliza um único arquivo `.env` para todas as configurações, tanto em desenvolvimento quanto em produção.
As variáveis de ambiente configuradas neste arquivo são:

```
# Banco de dados
DATABASE_URL="postgresql://bragfy_prod_user:UTUalTFMbclKQsO1xjnOyXvFqRvVfwDi@dpg-cvri7p3e5dus7389qv60-a.oregon-postgres.render.com/bragfy_prod"

# Telegram
TELEGRAM_BOT_TOKEN="seu-token-aqui"

# Ambiente
NODE_ENV="production"

# OpenRouter
OPENROUTER_API_KEY="sua-chave-aqui"
```

### Configuração no Render

1. Crie um novo Web Service no Render
2. Conecte seu repositório GitHub
3. Configure o serviço:

   - **Nome**: bragfy
   - **Ambiente**: Node
   - **Comando de Build**: `npm install && npm run build`
   - **Comando de Start**: `npm run setup && npm start`

4. Configure as variáveis de ambiente:

   - `NODE_ENV`: production
   - `DATABASE_URL`: URL do seu banco de dados PostgreSQL no Render
   - `TELEGRAM_BOT_TOKEN`: Token do seu bot do Telegram
   - `OPENROUTER_API_KEY`: Chave da API OpenRouter

5. Implante o serviço

## Desenvolvimento Local

Para executar o projeto localmente, você também usa o mesmo arquivo `.env`:

1. Copie o arquivo `.env.example` para `.env`
2. Ajuste as configurações conforme necessário para seu ambiente de desenvolvimento
3. Execute `npm run dev`

## Migrações do Banco de Dados

As migrações são gerenciadas pelo Prisma:

- **Desenvolvimento**:

  ```bash
  npm run db:migrate
  ```

- **Produção**:
  ```bash
  npm run migrate:prod
  ```

O script `npm run setup` já executa a migração durante a implantação no Render.

## Solução de Problemas

### Conectando ao Banco de Dados de Produção

Para verificar a conexão com o banco de dados de produção:

```bash
npx prisma db pull
```

### Logs

No Render, os logs podem ser visualizados diretamente na interface do serviço.
