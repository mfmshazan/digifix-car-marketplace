# 🐳 Docker Deployment Guide — DigiFix Car Marketplace

## 📋 Prerequisites

1. **Docker Desktop** installed and running — [Download](https://www.docker.com/products/docker-desktop/)
2. Docker Compose (included with Docker Desktop)

Verify:
```bash
docker --version
docker compose version
```

---

## � Docker Files Overview

```
digifix-car-marketplace-dev/
├── .env                          # Environment variables (read by docker compose)
├── docker-compose.yml            # Production build (backend + web)
├── docker-compose.dev.yml        # Development build (with hot-reloading)
├── backend/
│   ├── Dockerfile                # Backend production image
│   ├── Dockerfile.dev            # Backend development image
│   └── .dockerignore
└── apps/web/
    ├── Dockerfile                # Web production image (multi-stage Next.js build)
    ├── Dockerfile.dev            # Web development image
    └── .dockerignore
```

---

## 🚀 Deploy (Production Build)

### Step 1: Ensure `.env` is configured

The root `.env` file must contain your Supabase database URLs, JWT secret, and Clerk keys.
It should already be set up — verify with:

```bash
cat .env
```

### Step 2: Build and start all services

```bash
docker compose up --build
```

> Add `-d` to run in the background: `docker compose up --build -d`

### Step 3: Verify services

```bash
# Check container status
docker compose ps

# Backend health check
curl http://localhost:3000/health

# Web app
open http://localhost:3001
```

### Step 4: Stop services

```bash
# Stop all containers
docker compose down
```

---

## 🔧 Deploy (Development Mode with Hot-Reload)

```bash
# Build and start with hot-reloading
docker compose -f docker-compose.dev.yml up --build

# Stop
docker compose -f docker-compose.dev.yml down
```

In dev mode:
- **Backend** code changes in `backend/src/` are auto-reloaded via nodemon
- **Web** code changes in `apps/web/src/` are auto-reloaded via Next.js

---

## 📝 Common Commands

### Container Management

```bash
# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f backend
docker compose logs -f web

# Restart a service
docker compose restart backend

# Rebuild a single service
docker compose up --build backend

# Full rebuild (no cache)
docker compose build --no-cache
docker compose up
```

### Database Operations

```bash
# Run Prisma commands inside the backend container
docker compose exec backend npx prisma studio
docker compose exec backend npx prisma db push
docker compose exec backend npx prisma migrate deploy

# Shell access
docker compose exec backend sh
```

---

## 🔍 Troubleshooting

### Port already in use

Change ports in `.env`:
```
BACKEND_PORT=3002
WEB_PORT=3003
```

### Backend can't connect to Supabase

1. Verify `DATABASE_URL` and `DIRECT_URL` in `.env` are correct
2. Check your Supabase project is active: https://supabase.com/dashboard
3. View backend logs: `docker compose logs -f backend`

### Web build fails

```bash
# Rebuild from scratch
docker compose down
docker compose build --no-cache web
docker compose up
```

### Nuclear reset

```bash
docker compose down -v --rmi local
docker compose up --build
```

---

## 📱 Mobile App Connection

When running Docker locally, the mobile app needs your machine's IP:

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Use the IP in your mobile app API config:
# http://YOUR_IP:3000/api
```

---

## 🏭 Production Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to your actual domain (not `*`)
- [ ] Use HTTPS via reverse proxy (Nginx/Traefik)
- [ ] Remove Clerk test keys and use production keys
