# Bragfy 🚀

Um bot do Telegram que ajuda profissionais a registrar suas realizações diárias e gerar um "Brag Document", que pode ser compartilhado através de um link público.

## O que é um Brag Document?

Um Brag Document (ou "Documento de Conquistas") é uma prática recomendada para acompanhar suas realizações profissionais ao longo do tempo. Ele facilita:

- Avaliações de desempenho
- Solicitações de promoção
- Atualização de currículos e portfólios
- Reflexão sobre sua trajetória profissional

## Arquitetura

O Bragfy é dividido em dois componentes principais:

1. **Bot do Telegram (este repositório)**:

   - Oferece interface amigável via Telegram
   - Gerencia comunicação com o usuário
   - Envia os Brag Documents para a API da webapp para publicação

2. **Webapp Viewer (repositório separado)**:
   - Expõe rota API para receber e salvar documentos
   - Renderiza os documentos em HTML para visualização pública
   - Disponibiliza os links permanentes via `/u/[hash]`

## Funcionalidades

- **Interação simplificada**: Comandos diretos via Telegram (/start, /brag)
- **Geração de Brag Document**: Em formato Markdown diretamente no chat
- **Link compartilhável**: Crie um link público para compartilhar seu documento
- **Mode de simulação**: Para teste local sem um token do Telegram

## Tecnologias

- TypeScript
- Node.js
- API do Telegram Bot
- Axios para comunicação com a webapp

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
# URL da API do Viewer
VIEWER_API_URL="http://localhost:3000"

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

## Modo de Simulação

Se o token do Telegram não estiver configurado (`TELEGRAM_BOT_TOKEN` ausente no `.env`), o Bragfy entrará automaticamente no modo de simulação. Este modo é útil para:

- Testar a integração com a API sem um bot real
- Desenvolver novos recursos sem precisar do Telegram
- Depurar o fluxo de geração de documentos

O modo de simulação executa o fluxo para um usuário fictício e exibe logs detalhados no console.

## Comandos do Bot

- `/start` - Inicia a conversa com o bot e mostra instruções
- `/brag` - Gera um Brag Document com suas atividades recentes, oferecendo opções para:
  - Gerar link público via webapp
  - Gerar PDF (em desenvolvimento)

## Integração com a Webapp

O bot se comunica com a webapp (bragfy-viewer) através de:

1. **POST para `/api/publish`** - Envia o documento em HTML para ser salvo
2. **Links para `/u/[hash]`** - Fornece ao usuário o link para seu documento público

É necessário que a webapp esteja em execução e acessível na URL configurada em `VIEWER_API_URL`.

## Desenvolvimento Futuro

- Exportação para PDF
- Integração com Supabase para armazenamento de dados
- Suporte a markdown avançado e formatação personalizada
- Integrações com outras plataformas além do Telegram
