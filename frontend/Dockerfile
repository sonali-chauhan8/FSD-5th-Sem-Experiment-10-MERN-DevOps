# ====================================================================
# STAGE 1: Build React + Vite Single Page Application
# ====================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for efficient Docker layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies required for Vite build)
RUN npm install

# Copy application source code
COPY . .

# Build production bundle into /app/dist
RUN npm run build

# ====================================================================
# STAGE 2: Lightweight Nginx Web Server for Production Serving
# ====================================================================
FROM nginx:1.27-alpine AS production

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with React Router fallback and /api/ reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check to ensure Nginx is actively serving requests
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
