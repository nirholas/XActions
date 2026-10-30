# ═══════════════════════════════════════════════════════════════════════════════
# XActions — Production Dockerfile
# Multi-stage build: Node.js + Chromium for Puppeteer browser automation
# by nichxbt
# ═══════════════════════════════════════════════════════════════════════════════

# Stage 1: Dependencies
FROM node:22-slim AS deps

# The production stage runs the distro's Chromium, so Puppeteer's own download is wasted here.
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
# package.json overrides deepmerge with this patched copy, so npm ci needs it
COPY vendor ./vendor/

# Install production dependencies only
RUN npm ci --omit=dev && npx prisma generate

# ═══════════════════════════════════════════════════════════════════════════════
# Stage 2: Production runtime
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:22-slim AS production

# Install Chromium and required system dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer config — use system Chromium instead of downloading
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Copy dependencies from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application code
COPY . .

# Create non-root user for security
RUN groupadd -r xactions && useradd -r -g xactions -G audio,video xactions \
    && mkdir -p /home/xactions/Downloads \
    && chown -R xactions:xactions /home/xactions \
    && chown -R xactions:xactions /app \
    && chmod +x /app/start.sh

USER xactions

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Run migrations then start the API server
CMD ["/bin/sh", "/app/start.sh"]
