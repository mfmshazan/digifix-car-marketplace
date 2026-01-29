# 🐳 Docker Guide for DigiFix Car Marketplace

This guide explains how to run the DigiFix Car Marketplace application using Docker.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
2. **Docker Compose** - Usually included with Docker Desktop

### Verify Installation

```powershell
# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version
```

---

## 🚀 Quick Start

### Step 1: Clone and Navigate to Project

```powershell
cd e:\Mobile-apps\digifix-car-marketplace
```

### Step 2: Create Environment File

```powershell
# Copy the example environment file
Copy-Item .env.docker.example .env
```

### Step 3: Build and Start Containers

```powershell
# Build and start all services in detached mode
docker-compose up -d --build
```

### Step 4: Verify Services are Running

```powershell
# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 5: Access the Application

- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5432

---

## 📁 Docker Files Structure

```
digifix-car-marketplace/
├── docker-compose.yml          # Main orchestration file
├── docker-compose.dev.yml      # Development overrides
├── .env.docker.example         # Environment template
├── .env                        # Your environment file (create from example)
└── backend/
    ├── Dockerfile              # Production Dockerfile
    ├── Dockerfile.dev          # Development Dockerfile
    └── .dockerignore           # Files to exclude from Docker build
```

---

## 🔧 Development Mode

For development with hot-reloading:

```powershell
# Start with development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# View logs in real-time
docker-compose logs -f backend
```

This mounts your source code into the container, so changes are reflected immediately.

---

## 📝 Common Commands

### Container Management

```powershell
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Restart a specific service
docker-compose restart backend

# Rebuild a specific service
docker-compose up -d --build backend
```

### Viewing Logs

```powershell
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Database Operations

```powershell
# Access PostgreSQL CLI
docker-compose exec postgres psql -U digifix -d digifix_db

# Run Prisma migrations manually
docker-compose exec backend npx prisma migrate deploy

# Open Prisma Studio (access at http://localhost:5555)
docker-compose exec backend npx prisma studio

# Reset database (⚠️ destroys all data)
docker-compose exec backend npx prisma migrate reset --force
```

### Shell Access

```powershell
# Access backend container shell
docker-compose exec backend sh

# Access PostgreSQL container shell
docker-compose exec postgres sh
```

---

## 🔍 Troubleshooting

### Issue: Port already in use

```powershell
# Change port in .env file
BACKEND_PORT=3001
POSTGRES_PORT=5433

# Or stop the conflicting service
docker-compose down
```

### Issue: Database connection failed

```powershell
# 1. Check if PostgreSQL is healthy
docker-compose ps

# 2. View PostgreSQL logs
docker-compose logs postgres

# 3. Restart PostgreSQL
docker-compose restart postgres

# 4. Wait for it to be healthy, then restart backend
docker-compose restart backend
```

### Issue: Prisma migration errors

```powershell
# Reset the database and re-run migrations
docker-compose exec backend npx prisma migrate reset --force
```

### Issue: Changes not reflecting

```powershell
# Rebuild containers
docker-compose up -d --build --force-recreate
```

### Issue: Clean start needed

```powershell
# Nuclear option - removes everything
docker-compose down -v --rmi local
docker-compose up -d --build
```

---

## 🏭 Production Deployment

For production, ensure you:

1. **Change default passwords** in `.env`:
   ```
   POSTGRES_PASSWORD=strong-unique-password
   JWT_SECRET=long-random-secret-key
   ```

2. **Use production environment**:
   ```
   NODE_ENV=production
   ```

3. **Configure proper CORS**:
   ```
   FRONTEND_URL=https://your-domain.com
   ```

4. **Enable HTTPS** (use a reverse proxy like Nginx or Traefik)

---

## 📊 Monitoring

### Check Container Health

```powershell
# View container stats
docker stats

# Check health status
docker inspect --format='{{.State.Health.Status}}' digifix-backend
docker inspect --format='{{.State.Health.Status}}' digifix-postgres
```

### Resource Usage

```powershell
# See disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

---

## 🔐 Security Notes

1. **Never commit `.env` files** to version control
2. **Use secrets management** in production (Docker Swarm secrets, Kubernetes secrets, etc.)
3. **Regularly update base images** for security patches
4. **Use non-root users** in containers (already configured in Dockerfile)

---

## 📱 Mobile App Connection

The mobile app (Expo) connects to the backend API. When running locally:

1. Find your machine's IP address:
   ```powershell
   ipconfig
   ```

2. Update the mobile app's API URL to use your IP instead of `localhost`:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```

This is necessary because the mobile emulator/device cannot access `localhost` of the host machine directly.

---

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify container status: `docker-compose ps`
3. Ensure Docker Desktop is running
4. Try rebuilding: `docker-compose up -d --build --force-recreate`
