# --- STAGE 1: Builder ---
FROM node:24-alpine AS builder

# Create app directory
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build

# --- STAGE 2: Runner ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 8080

USER node

CMD ["node", "dist/index.js"]
