#!/bin/bash

# Instalar dependências
npm ci

# Gerar arquivos do Prisma
npx prisma generate

# Compilar projeto
npm run build

# Saída de sucesso
echo "Build completed successfully!" 