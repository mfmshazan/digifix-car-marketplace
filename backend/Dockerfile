# Single-stage image (avoids multi-stage export/snapshot issues on some Docker Desktop builds).
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dependencies and Prisma client (as root — node_modules readable by app user)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install && \
    npx prisma generate

# Application source
COPY --chown=nodejs:nodejs . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use 'prisma migrate deploy' in production when migrations are ready
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/index.js"]
