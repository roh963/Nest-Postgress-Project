# Use Node.js 20 as the base image for compatibility with @nestjs/core@11.1.6
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json, package-lock.json, tsconfig.json, and prisma directory early
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install dependencies and generate Prisma client
RUN npm ci
RUN npx prisma generate

# Copy source code (including notifications.worker.ts)
COPY src ./src

# Build the NestJS app (compiles src to dist, including notifications.worker.ts)
RUN npm run build

# Expose port for API
EXPOSE 3000

# Default command (overridden in docker-compose.yml for api and worker)
CMD ["npm", "run", "start:prod"]