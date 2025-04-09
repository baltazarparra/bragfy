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
