Assistente de Brag Document no Telegram, desenvolvido 100% com Cursor + Claude 3.7

🧠 UX — Experiência do Usuário
Jornada do Usuário
Ao abrir o bot:

Tentamos recuperar seus dados via API do Telegram.

Se não for possível, pedimos o comando /start para obter as informações básicas.

Se for um novo usuário:

Salvamos seus dados no banco (nome, username, ID).

Apresentamos o bot e perguntamos se quer registrar sua primeira atividade.

Ao enviar uma mensagem:

Perguntamos se quer editar, cancelar ou confirmar o conteúdo.

Após a confirmação, salvamos a atividade com ID, timestamp e mensagem.

Damos feedback de sucesso ou erro.

Para gerar um relatório:

O usuário pode digitar: Bragfy, Gerar Brag, Gerar Brag Document, Gerar PDF ou /brag.

Mostramos três botões:

Atividades de hoje

Atividades dos últimos 7 dias

Atividades dos últimos 30 dias

Ao selecionar um deles, mostramos uma tabela com as atividades e um botão "Gerar PDF".

PDF é gerado com visual elegante, informações do usuário e atividades listadas.

🛠 DX — Experiência do Desenvolvedor
Stack Técnica
Linguagem: TypeScript

Framework: Node.js (com Telegram Bot API)

ORM: Prisma

Banco de Dados: PostgreSQL

Ambiente: Desenvolvimento local com SQLite / Produção com PostgreSQL (Railway, Neon ou Planetscale)

Testes: Vitest (testes unitários e de integração com mocks controlados)

CI/CD: GitHub Actions (opcional, com lint + test)

PDF: Geração com pdf-lib ou puppeteer + HTML/CSS (modo headless)

Arquitetura
Monorepo opcional com /src estruturado por contexto:

bash
Copiar
Editar
/src
└── bot
├── handlers/
├── commands/
├── messages/
└── db
├── prisma/
└── client.ts
└── utils/
Todos os comandos e interações encapsulados em handlers reusáveis

Separação de responsabilidades: coleta de mensagens, persistência, geração de documento e interação

🤖 AX — Experiência do Assistente (BOT)
Ignora mensagens como "oi", "olá", etc.

Reconhece comandos por texto ou botões interativos

Sempre responde com feedback claro (salvo com sucesso, erro, etc)

Atividades têm:

ID único (auto-incremental ou UUID)

Timestamp formatado (dd/mm/yyyy hh:mm:ss)

Permite edição e cancelamento antes da confirmação

Usa botões (inline keyboard) sempre que possível para tornar a experiência mais fluida

Armazena todas as interações úteis (atividades confirmadas), ignorando comandos ou mensagens irrelevantes

📄 Futuras Features (v2+)
Suporte a múltiplos idiomas

Exportar CSV além de PDF

Filtros personalizados por período

Integração com WhatsApp via Meta API
