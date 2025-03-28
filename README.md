# Bragfy 🚀

Um bot do Telegram que ajuda profissionais a registrar suas realizações diárias e gerar um "Brag Document" em Markdown ou PDF - um documento que destaca suas conquistas profissionais para avaliações, promoções ou portfólio.

## O que é um Brag Document?

Um Brag Document (ou "Documento de Conquistas") é uma prática recomendada para acompanhar suas realizações profissionais ao longo do tempo. Ele facilita:

- Avaliações de desempenho
- Solicitações de promoção
- Atualização de currículos e portfólios
- Reflexão sobre sua trajetória profissional

## Funcionalidades

- **Registro simplificado**: Envie mensagens diretamente pelo Telegram
- **Confirmação interativa**: Confirme, edite ou cancele registros via botões
- **Armazenamento seguro**: Suas atividades são armazenadas com timestamp e ID
- **Geração de Brag Document**: Visualize suas conquistas em formato de tabela Markdown
- **Filtros por período**: Selecione atividades de hoje, últimos 7 dias ou 30 dias
- **Geração de PDF**: (Em breve) Exporte seu Brag Document em PDF formatado

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

## Como usar o Bragfy

### Iniciando com o bot

Você pode começar a usar o Bragfy de duas maneiras:

1. **Diretamente**: Acesse [@bragfy_bot](https://t.me/bragfy_bot) e envie o comando `/start`

2. **Via deep link**: Use um link personalizado como [https://t.me/bragfy_bot?start=landing](https://t.me/bragfy_bot?start=landing)

### Registrando atividades

Para registrar uma atividade:

1. Envie uma mensagem de texto descrevendo sua realização:

   ```
   Finalizei a implementação do sistema de autenticação com 99.8% de cobertura de testes
   ```

2. O bot responderá mostrando sua mensagem e oferecendo três opções:

   ```
   Recebi sua atividade:

   "Finalizei a implementação do sistema de autenticação com 99.8% de cobertura de testes"

   Deseja confirmar, editar ou cancelar?
   [✅ Confirmar] [✏️ Editar] [❌ Cancelar]
   ```

3. Selecione uma das opções:

   - ✅ **Confirmar**: Inicia o processo de classificação da atividade
   - ✏️ **Editar**: Permite enviar uma versão corrigida
   - ❌ **Cancelar**: Descarta a atividade

4. Ao confirmar, o bot enviará uma nova mensagem perguntando a urgência:

   ```
   Qual é a urgência desta atividade?

   "Finalizei a implementação do sistema de autenticação com 99.8% de cobertura de testes"

   [Alta] [Média] [Baixa]
   ```

5. Após escolher a urgência, o bot enviará outra mensagem perguntando o impacto:

   ```
   Qual é o impacto desta atividade?

   "Finalizei a implementação do sistema de autenticação com 99.8% de cobertura de testes"

   Urgência: Alta

   [Alto] [Médio] [Baixo]
   ```

6. Ao final, você receberá uma confirmação com data e hora:

   ```
   ✅ Atividade registrada com sucesso!

   ID: 42
   Data: 27/03/2025 15:30:45

   Conteúdo:
   "Finalizei a implementação do sistema de autenticação com 99.8% de cobertura de testes"

   • Urgência: Alta
   • Impacto: Alto
   ```

### Gerando seu Brag Document

Para gerar um documento com suas atividades registradas:

1. Envie qualquer um dos seguintes comandos ou mensagens:

   - `/brag` ou `/bragfy`
   - `bragfy`
   - Frases como: `gerar brag`, `gerar documento`, `gerar pdf`, `gerar relatorio`

2. O bot responderá com opções de período:

   ```
   Vamos gerar seu Brag Document! Escolha o período desejado:
   [Atividades de hoje] [Últimos 7 dias] [Últimos 30 dias]
   ```

3. Ao selecionar um período, o bot gerará um documento em formato Markdown contendo:

   - **Cabeçalho**: Seu nome completo
   - **Lista de atividades**: Suas conquistas no período com data/hora
   - **Timestamp**: Data e hora da geração

   Exemplo:

   ```
   BRAG DOCUMENT

   João Silva

   ―――――――――――――

   ATIVIDADES

   27/03/2025 15:30:45
   Finalizei o sistema de autenticação

   27/03/2025 16:42:10
   Refatorei layout do dashboard

   ―――――――――――――

   Documento gerado em 28/03/2025 10:15:30
   ```

## Roadmap

### Implementado ✓

- Registro de usuários via `/start` ou deep link
- Registro de atividades com confirmação interativa
- Armazenamento em banco de dados com timestamps
- Interface com botões inline para melhor experiência
- Geração de Brag Document em formato Markdown
- Filtros por período (hoje, 7 dias, 30 dias)

### Em desenvolvimento 🚧

- Fluxo de edição de atividades
- Geração de PDF com layout profissional
- Comandos para visualizar estatísticas de uso

### Futuro 🔮

- Suporte a múltiplos idiomas
- Exportação em formatos alternativos (CSV)
- Filtros personalizados por categoria ou tag
- Integração com WhatsApp via Meta API

## Licença

Este projeto está licenciado sob a licença ISC.
