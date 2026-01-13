# authservice2/Dockerfile

# ── Stage 1: Build and Prisma generate ─────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# 1) Install ALL deps (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# 2) Copy Prisma schema & generate client
COPY prisma ./prisma
RUN npx prisma generate

# 3) Copy source & compile
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install dos2unix for line ending conversion and curl for health checks
RUN apk add --no-cache dos2unix curl

# 1) Pull in only the generated node_modules (with .prisma/client inside)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# 2) Bring over your compiled code & Prisma folder (schema for migrations, etc.)
COPY --from=builder /usr/src/app/dist   ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

# 3) (Optional) copy package.json for metadata
COPY package.json ./
COPY docker-entrypoint.sh ./

# 4) Copy proto files
COPY proto ./proto

# Convert line endings and make executable
RUN dos2unix docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3001 50051
ENTRYPOINT ["./docker-entrypoint.sh"]
