# ====================================================================
# Backend Dockerfile - Production Express & Node.js Runtime
# Multi-stage / optimized lightweight Alpine container
# ====================================================================
FROM node:20-alpine AS base

# Create and define application working directory
WORKDIR /usr/src/app

# Set production environment variable
ENV NODE_ENV=production

# Copy package manifests first for Docker layer caching
COPY package*.json ./

# Install only production dependencies for minimal image footprint
RUN npm ci --omit=dev && node -e "require('dotenv'); console.log('Backend dependencies verified')"
# Copy application source files
COPY . .
RUN node -e "require('dotenv'); console.log('Dependencies still present after COPY')"

# Set correct ownership of working directory to non-root user
RUN chown -R node:node /usr/src/app

# Switch to the non-root 'node' user for security hardening
USER node

# Expose backend port inside container
EXPOSE 5000

# Container healthcheck: probes GET /api/health using native Node.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the Express server
CMD ["node", "server.js"]
