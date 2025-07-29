# Multi-stage Node.js Dockerfile
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Copy package files
COPY package*.json ./

# Dependencies stage
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Development dependencies stage
FROM base AS dev-dependencies
RUN npm ci

# Build stage
FROM dev-dependencies AS build
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=dependencies --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodeuser:nodejs /app/dist ./dist
COPY --chown=nodeuser:nodejs package*.json ./

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]

# Development stage
FROM dev-dependencies AS development
COPY src ./src
COPY tsconfig.json ./

# Switch to non-root user
USER nodeuser

# Expose port and debug port
EXPOSE 3000 9229

# Start with nodemon for development
CMD ["npm", "run", "dev"]