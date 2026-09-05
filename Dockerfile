# Multi-stage production Dockerfile for Cloud Run
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app

# Security: run as non-root node user
USER node

# Copy dependencies and application code
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node . .

# Cloud Run defaults
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
