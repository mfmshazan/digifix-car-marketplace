# ================================
# Stage 1: Dependencies
# ================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install libc6-compat for Alpine compatibility with Next.js
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# ================================
# Stage 2: Builder
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js application
RUN npm run build

# ================================
# Stage 3: Production Runner
# ================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder /app/public ./public

# Copy the standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
