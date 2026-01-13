# gateway/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# 1) dependencies
COPY package*.json ./
RUN npm ci

# 2) copy everything else
COPY . .

# 3) build
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /usr/src/app

# Install curl for health checks
RUN apk add --no-cache curl

# 1) copy built app
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./

# 2) copy proto files
COPY proto ./proto

# 3) create uploads directory
RUN mkdir -p uploads

EXPOSE 3000
CMD ["node", "dist/main.js"]
