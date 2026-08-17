# Single-stage image (avoids multi-stage export/snapshot issues on some Docker Desktop builds).
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dependencies and Prisma client (as root — node_modules readable by app user)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci && \
    npx prisma generate && \
    chown -R nodejs:nodejs /app/node_modules

# Application source
COPY --chown=nodejs:nodejs . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER nodejs

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# The production database is already provisioned. Running `prisma db push` on every
# start aborts the deploy whenever the live DB has columns/enums the schema doesn't
# (data-loss guard), so we just start the server. Apply schema changes deliberately
# with `prisma migrate deploy` / `db push` as a one-off when needed, not on boot.
CMD ["sh", "-c", "node src/index.js"]
