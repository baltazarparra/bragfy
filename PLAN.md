# Bragfy – PLAN.md

## 🧠 Overview

Bragfy is a micro-SaaS that helps managers and professionals capture their accomplishments via Telegram and generate elegant, human-readable Brag Documents. It should feel like magic: fast, frictionless, and beautifully simple.

This is a Telegram-first MVP, developed with Claude 3.7 inside Cursor, and guided by four pillars:

- 💻 DX (Developer Experience)
- 🤖 AX (Assistant Experience)
- 👤 UX (User Experience)
- 🍏 Design Excellence (inspired by Apple’s philosophy of simplicity and beauty)

---

## 🧱 Tech Stack

- `node-telegram-bot-api` – Telegram integration
- `Prisma + SQLite` – Local persistence
- `uuid` – Unique activity identifiers
- `date-fns` – Date parsing/formatting
- `puppeteer` – PDF generation from HTML
- `Fastify` – HTTP healthcheck and future endpoints
- `dotenv` – Secure environment variables
- `Yarn v4` – Package manager
- `Vitest` – Test runner (TDD from day one)
- `tsup` (optional) – Build tool if needed later

---

## 📁 Folder Structure

- `src/bot.ts` – Initializes and runs the bot
- `src/handlers/onMessage.ts` – Handles incoming text messages
- `src/handlers/onStart.ts` – Handles the `/start` command
- `src/handlers/onBrag.ts` – Handles the `/brag` command
- `src/utils/extractTime.ts` – Extracts time from message strings
- `src/utils/formatTimestamp.ts` – Formats timestamps into `DD/MM/YY HH:MM:SS`
- `src/utils/pdf.ts` – Generates PDF from a list of activities
- `src/db.ts` – Loads and initializes Prisma
- `src/types.ts` – Shared TypeScript types
- `tests/` – All test files (Vitest, TDD-first)
- `prisma/schema.prisma` – Defines the Activity model
- `.env` and `.env.example` – Secure bot token
- `README.md` – Full setup guide
- `tsconfig.json`, `.gitignore`, etc. – Standard configs

---

## 🧪 TDD Rule

All new features must follow test-first development.

Each implementation must begin with a unit test using Vitest that describes the desired behavior and verifies correct output. Tests should be readable, isolated, and AI-friendly.

---

## 📦 Features

### 1. Registering activities

When a user sends a message like:  
**"Reunião com investidores às 10h"**

The system must:

- Extract the time if present (`às 10h`, `10:00`, etc.)
- If no time is found, use the message timestamp
- Save the activity with:
  - `id` (UUID)
  - `telegramUserId`
  - `message` (original text)
  - `timestamp` (in `DD/MM/YY HH:MM:SS` format)

### 2. `/start` command

Registers the user if needed.  
Sends a friendly welcome message:

> 👋 Bem-vindo ao Bragfy.  
> Tudo o que você mandar por aqui será registrado como uma atividade.

### 3. `/brag` command

- Asks:

  > De qual período você deseja gerar o relatório? (Últimos 30 dias ou Personalizado)

- After user chooses:
  - Fetch activities from the selected period
  - Send a **text-based table** with all activities, formatted cleanly
  - Add two inline buttons:
    - 📋 “Copiar conteúdo”
    - 📄 “Gerar PDF” (sends a styled, branded PDF)

---

## 🎨 UX + Design Principles

- Everything must feel intentional, minimal and frictionless
- Textual outputs (tables, replies, PDF) should be clean, clear and beautifully spaced
- The experience must evoke clarity and confidence — inspired by Apple's design philosophy
- Keep feedback instant, buttons intuitive, and avoid overloading the user

---

## 🧠 DX + AX Guidelines

- Use clear naming and pure functions wherever possible
- Maintain full typing and helpful inline comments
- Keep each file focused on a single responsibility
- Structure code for easy readability by AI and humans
- After each prompt, validate:
  1. Was the structure correctly generated?
  2. Are all files functional and scoped?
  3. Is there anything incomplete, vague, or too generic?

If any step fails validation, fix it before proceeding.

---

## 🔐 Environment

- `.env` should include:  
  `BOT_TOKEN=token`

- Use polling (not webhook) for development
- Optional: Use `ngrok` if webhook testing is desired later

---

## 🏁 Final Goals

- Launch a Telegram bot that makes bragging easy, elegant and joyful
- Validate the product through usage and feedback
- Prepare for a future WebApp (Next.js) as a second layer
- Keep everything clean, testable, AI-extendable, and pixel-thoughtful
