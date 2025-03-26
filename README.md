# 🤖 Bragfy

Um micro-SaaS que ajuda profissionais a capturar seus feitos via Telegram e gerar Brag Documents elegantes e legíveis.

## 🚀 Começando

Siga estas instruções para configurar e executar seu próprio bot Bragfy localmente.

### Pré-requisitos

- Node.js (v16 ou superior)
- Yarn (v1.22 ou superior)
- Conta no Telegram

### Instalação

1. Clone este repositório:

   ```bash
   git clone https://github.com/seu-usuario/bragfy.git
   cd bragfy
   ```

2. Instale as dependências:

   ```bash
   yarn install
   ```

3. Crie um arquivo `.env` baseado no exemplo:

   ```bash
   cp .env.example .env
   ```

4. Edite o arquivo `.env` e adicione seu token do bot (veja a seção "Criando um Bot no Telegram" abaixo)

5. Configure o banco de dados:

   ```bash
   yarn db:push
   ```

6. Inicie o bot em modo de desenvolvimento:
   ```bash
   yarn dev
   ```

## 📱 Criando um Bot no Telegram

1. Abra o Telegram e busque por `@BotFather`
2. Inicie uma conversa e envie o comando `/newbot`
3. Siga as instruções para dar um nome e username ao seu bot
4. Copie o token HTTP API fornecido pelo BotFather
5. Cole este token no seu arquivo `.env` como `BOT_TOKEN=seu-token-aqui`

## 🧪 Testes

Execute os testes com:

```bash
yarn test
```

Ou em modo de observação:

```bash
yarn test:watch
```

## 🌟 Funcionalidades

- **Registro de atividades**: Envie qualquer mensagem para registrar uma atividade
- **Detecção inteligente de horário**: Mencione "às 10h" ou "14:30" para registrar o momento específico
- **Geração de relatórios**: Use o comando `/brag` para gerar documentos com suas atividades
- **Exportação em PDF**: Obtenha um relatório formatado elegantemente em PDF

## 📋 Comandos

- `/start` - Inicia o bot e exibe instruções de uso
- `/brag` - Gera um relatório de atividades

## 🛠️ Tecnologias

- Node.js
- TypeScript
- Prisma + SQLite
- Node Telegram Bot API
- Puppeteer para geração de PDF
- Fastify para healthcheck

## 📝 Roadmap

- Interface web com Next.js
- Sincronização com calendário
- Temas personalizados para PDF
- Exportação para mais formatos (Markdown, HTML)

---

Desenvolvido com ❤️ usando Claude 3.7

## Descrição da Empresa

A **Bragfy** é uma empresa inovadora que desenvolve soluções inteligentes para profissionais que desejam otimizar sua produtividade e organização. Nosso principal produto é um **assistente no WhatsApp** que coleta e organiza as atividades profissionais realizadas durante o dia, transformando-as em um **Brag Document** (documento de conquistas) personalizado.

Com o assistente da Bragfy, você pode:

- **Registrar facilmente** suas tarefas e conquistas diárias diretamente no WhatsApp.
- **Gerar relatórios automáticos** com base no período solicitado, destacando suas principais atividades e resultados.
- **Manter um histórico organizado** de suas realizações profissionais, ideal para avaliações de desempenho, portfólios ou atualizações de currículo.

Nosso objetivo é simplificar a vida dos profissionais, ajudando-os a documentar e celebrar suas conquistas de forma prática e eficiente. Com a Bragfy, você foca no que realmente importa: o seu trabalho. Deixe a organização e a documentação conosco!

## Informações de Contato

- **Email:** baltazarparra@outlook.com
- **Telefone:** (11) 5198-7616
- **CNPJ:** 35.243.881/0001-56
- **Endereço:** Rua Salvador Arruda 100, Porto Feliz/SP

## Política de Privacidade

A **Bragfy** respeita a privacidade dos seus usuários. Coletamos e utilizamos informações pessoais apenas para fornecer e melhorar nossos serviços. Todas as informações são protegidas de acordo com as leis de proteção de dados vigentes.

## Termos de Uso

Ao utilizar os serviços da **Bragfy**, você concorda com nossos Termos de Uso. Estes termos incluem as condições de uso do site, responsabilidades do usuário e direitos da empresa.

## Sobre Nós

A **Bragfy** foi fundada em 2025 com o objetivo de desenvolver soluções inteligentes para profissionais que desejam otimizar sua produtividade e organização. Nossa equipe é composta por profissionais qualificados e dedicados a oferecer a melhor experiência para nossos clientes.

## Perguntas Frequentes (FAQ)

### 1. Como posso entrar em contato com a Bragfy?

Você pode nos contatar através do email baltazarparra@outlook.com ou pelo telefone (11) 5198-7616.

### 2. Quais são os horários de atendimento?

Nosso atendimento funciona de 10h as 15h

## Redes Sociais

Siga-nos nas redes sociais para ficar por dentro das novidades:

- [Facebook](https://www.facebook.com/profile.php?id=61572239647243)

## Diretrizes de Conteúdo

Nosso site segue as diretrizes de conteúdo do Facebook Meta Business, garantindo que todas as informações sejam claras, precisas e relevantes para nossos usuários :cite[7].

## Verificação de Negócio

Para verificar a autenticidade da **Bragfy**, estamos disponibilizando nossos documentos oficiais, incluindo CNPJ e comprovante de endereço, conforme exigido pelo Facebook Meta Business :cite[9]:cite[10].
