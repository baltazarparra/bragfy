# Bragfy - Plano de Desenvolvimento

Um assistente de Brag Document no Telegram, desenvolvido com Cursor + Claude 3.7.

## Status do Projeto

### ✅ Recursos Implementados

- **Registro de usuário**

  - Cadastro via comando `/start`
  - Suporte a deep links com origem (ex: `?start=instagram`)
  - Armazenamento seguro no banco de dados

- **Gestão de atividades**

  - Registro via mensagens de texto diretas
  - Interface interativa com botões inline
  - Confirmação, edição ou cancelamento
  - Armazenamento com ID único e timestamp formatado
  - Feedback claro para cada ação do usuário

- **Infraestrutura**
  - ORM Prisma configurado
  - Ambiente de desenvolvimento com SQLite
  - Modelos de dados relacionais (User-Activity)
  - Handlers modularizados para comandos e callbacks

### 🚧 Próximos Passos

- **Edição de atividades**

  - Implementar fluxo completo de edição
  - Histórico de versões (opcional)

- **Visualização de atividades**

  - Comando para listar atividades por período
  - Opções: hoje, 7 dias, 30 dias
  - Interface interativa com paginação

- **Geração de documentos**
  - Exportação para PDF
  - Layout profissional e customizável
  - Filtros por período

### 🔮 Visão de Longo Prazo

- Suporte a múltiplos idiomas
- Exportação em formatos alternativos (CSV, Markdown)
- Filtros personalizados por período ou tag
- Integração com WhatsApp via Meta API

## 🧠 UX — Experiência do Usuário

### Jornada do Usuário

**Ao abrir o bot:**

- Tentamos recuperar seus dados via API do Telegram
- Se não for possível, pedimos o comando `/start` para obter informações básicas

**Se for um novo usuário:**

- Salvamos seus dados no banco (nome, username, ID)
- Apresentamos o bot e suas funcionalidades

**Ao enviar uma mensagem:**

- Perguntamos se quer editar, cancelar ou confirmar o conteúdo
- Após a confirmação, salvamos a atividade com ID, timestamp e mensagem
- Damos feedback de sucesso ou erro

**Para gerar um relatório (futuro):**

- O usuário poderá usar comandos específicos
- Mostramos três opções de período
- Ao selecionar, exibimos as atividades e opção de gerar PDF

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
- **Logs**: Console.log para depuração e monitoramento
- **Comentários**: JSDoc para funções principais
- **Formatação**: Prettier para estilo consistente
- **Linting**: ESLint para qualidade de código
- **Testes**: Unitários para funções e mock para handlers

## 🤖 AX — Experiência do Assistente (BOT)

- Ignora mensagens irrelevantes
- Interface com botões inline sempre que possível
- Feedback claro para cada ação (sucesso, erro)
- Mensagens formatadas para melhor legibilidade
- Timestamps em formato legível (dd/mm/yyyy hh:mm:ss)
- Botões para navegação intuitiva
