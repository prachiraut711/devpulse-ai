# ==============================================================================
# DevPulse AI - Frontend Dockerfile
# Multi-stage production build: Node.js (Build) -> Nginx Alpine (Serve)
# ==============================================================================

# Stage 1: Build production static bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definition files first for optimal caching
COPY package.json package-lock.json* ./

# Install dependencies (fallback to npm install if package-lock is absent/desynced)
RUN npm ci || npm install

# Copy application source code
COPY . .

# Compile TypeScript and build production bundle via Vite
RUN npm run build

# Stage 2: Serve optimized assets with lightweight Nginx web server
FROM nginx:1.27-alpine

# Replace default configuration with custom reverse proxy and SPA routing config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose internal HTTP port
EXPOSE 80

# Health check to ensure Nginx is serving the SPA
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
