# Builder stage: Install all deps, generate Prisma, build app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files, tsconfig, prisma
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY prisma ./prisma

# Install all dependencies (including dev for Prisma generate)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build the app (compiles to dist, including worker)
RUN npm run build

# Runtime stage: Prod deps only, non-root
FROM node:20-alpine AS runtime

# Set NODE_ENV to production
ENV NODE_ENV=production

WORKDIR /app

# Add non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nestjs \
    && chown -R nestjs:nodejs /app

# Add netcat for worker retry
USER root
RUN apk add --no-cache netcat-openbsd wget
USER nestjs

# Copy package files for prod install
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built dist from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy Prisma client (generated) and prisma folder for schema
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Expose port
ENV PORT=3000
EXPOSE $PORT

# Healthcheck (standardize to /health)
ENV HEALTH_PATH=/health
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:$PORT$HEALTH_PATH || exit 1

# Default command (for api service)
CMD ["node", "dist/main"]