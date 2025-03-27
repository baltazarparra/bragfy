# Bragfy – Technical Plan

## Goal
A bot that lets users send a message with a brag (professional activity) and confirm it before saving to database. Later, users can request a brag document report.

## Milestone 1 – Telegram MVP
- [x] Telegram Bot setup
- [x] SQLite + Prisma
- [x] Confirm activity before saving
- [ ] Save message + timestamp + user
- [ ] Generate text-based brag report
- [ ] Handle errors and feedback clearly

## Next Steps
- WhatsApp integration
- PDF generation
- Metadata tagging (project, impact, etc.)
- Admin dashboard (optional)

## Principles
- DX: fast feedback, dev-mode logs, tests
- AX: fast flows, confirmation always visible
- UX: clear bot messages and feedback 