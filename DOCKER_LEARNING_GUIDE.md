# 🐳 Docker Learning Guide for Developers

A comprehensive guide to understanding and using Docker for your DigiFix Car Marketplace project.

---

## 📚 Table of Contents

1. [What is Docker?](#what-is-docker)
2. [Key Concepts](#key-concepts)
3. [Checking Versions & Dependencies](#checking-versions--dependencies)
4. [Essential Docker Commands](#essential-docker-commands)
5. [Docker Compose Commands](#docker-compose-commands)
6. [Understanding Your Project's Docker Setup](#understanding-your-projects-docker-setup)
7. [Advanced Docker Commands](#advanced-docker-commands)
8. [Best Practices](#best-practices)
9. [Learning Resources](#learning-resources)

---

## 🤔 What is Docker?

**Docker** is a platform that allows you to package your application and all its dependencies into a **container** - a lightweight, portable, self-sufficient unit that can run anywhere.

### Why Use Docker?

| Problem | Docker Solution |
|---------|----------------|
| "It works on my machine!" | Same environment everywhere |
| Complex setup process | One command to run everything |
| Dependency conflicts | Isolated environments |
| Multiple versions needed | Multiple containers, no conflicts |

### Real-World Analogy

Think of Docker like **shipping containers**:
- Ships don't care what's inside the container
- Containers are standardized and portable
- You can stack/organize them easily
- Contents are isolated and protected

---

## 🎯 Key Concepts

### 1. **Image** 📦
A blueprint/template for creating containers. Like a recipe.

```
Think: Class in programming
```

**Example:**
```dockerfile
FROM node:20-alpine  # Start from Node.js image
COPY . /app          # Copy your code
RUN npm install      # Install dependencies
```

### 2. **Container** 🏃
A running instance of an image. Like an active process.

```
Think: Object/Instance in programming
```

**Example:** Your running backend API server

### 3. **Dockerfile** 📄
Instructions to build an image.

```dockerfile
# Choose base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Run command
CMD ["node", "src/index.js"]
```

### 4. **Docker Compose** 🎼
Tool to run multiple containers together.

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
  
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
```

### 5. **Volume** 💾
Persistent storage for containers (data survives container restarts).

```yaml
volumes:
  postgres_data:  # Database files stored here
```

### 6. **Network** 🌐
Communication channel between containers.

```yaml
networks:
  digifix-network:  # Containers can talk to each other
```

---

## 🔍 Checking Versions & Dependencies

### Method 1: Check Package Versions Inside Container

```powershell
# Node.js version
docker exec digifix-backend node --version

# npm version
docker exec digifix-backend npm --version

# List all npm packages
docker exec digifix-backend npm list --depth=0

# Check specific package version
docker exec digifix-backend npm list express

# PostgreSQL version
docker exec digifix-postgres psql --version

# Check Prisma version
docker exec digifix-backend npx prisma --version
```

### Method 2: Check Image Information

```powershell
# See all images
docker images

# Inspect an image
docker image inspect digifix-car-marketplace-backend

# Check image layers
docker history digifix-car-marketplace-backend
```

### Method 3: Enter Container Shell

```powershell
# Access backend container shell
docker exec -it digifix-backend sh

# Now you're inside the container! Run commands:
# ls                    # List files
# cat package.json      # View package.json
# which node            # Find Node.js location
# exit                  # Exit the container
```

### Method 4: View Container Details

```powershell
# Detailed container info
docker inspect digifix-backend

# See environment variables
docker inspect digifix-backend | Select-String "Env"

# Check mounted volumes
docker inspect digifix-backend | Select-String "Mounts"
```

---

## 🚀 Essential Docker Commands

### Container Management

```powershell
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Start a container
docker start digifix-backend

# Stop a container
docker stop digifix-backend

# Restart a container
docker restart digifix-backend

# Remove a container
docker rm digifix-backend

# Remove all stopped containers
docker container prune
```

### Image Management

```powershell
# List all images
docker images

# Pull an image from Docker Hub
docker pull postgres:16

# Remove an image
docker rmi image-name

# Remove unused images
docker image prune

# Build an image from Dockerfile
docker build -t my-app .
```

### Logs & Debugging

```powershell
# View container logs
docker logs digifix-backend

# Follow logs in real-time
docker logs -f digifix-backend

# View last 50 lines
docker logs --tail 50 digifix-backend

# View logs with timestamps
docker logs -t digifix-backend
```

### Execute Commands in Container

```powershell
# Run a command
docker exec digifix-backend ls -la

# Interactive shell (sh or bash)
docker exec -it digifix-backend sh

# Run as root user
docker exec -u root -it digifix-backend sh

# Run a Node.js script
docker exec digifix-backend node scripts/test.js
```

### System Information

```powershell
# Docker version
docker --version

# Detailed system info
docker info

# Disk usage
docker system df

# Clean up everything
docker system prune -a
```

---

## 🎼 Docker Compose Commands

### Basic Operations

```powershell
# Start all services (detached mode)
docker-compose up -d

# Start and rebuild
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Viewing & Monitoring

```powershell
# List services
docker-compose ps

# View logs (all services)
docker-compose logs

# Follow logs
docker-compose logs -f

# Logs for specific service
docker-compose logs -f backend

# View resource usage
docker-compose top
```

### Building & Managing

```powershell
# Build/rebuild services
docker-compose build

# Build without cache
docker-compose build --no-cache

# Pull latest images
docker-compose pull

# Validate docker-compose.yml
docker-compose config
```

### Executing Commands

```powershell
# Run command in service
docker-compose exec backend npm list

# Run command in new container
docker-compose run backend npm install express

# Open shell in service
docker-compose exec backend sh
```

---

## 🏗️ Understanding Your Project's Docker Setup

### File Structure

```
digifix-car-marketplace/
├── docker-compose.yml          # Orchestrates all services
├── .env                        # Environment variables
└── backend/
    ├── Dockerfile              # Production build
    ├── Dockerfile.dev          # Development build
    └── .dockerignore           # Files to exclude
```

### 1. Dockerfile (Production)

**Location:** `backend/Dockerfile`

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# Stage 2: Production image
FROM node:20-alpine AS production
WORKDIR /app
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
USER nodejs
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/index.js"]
```

**What it does:**
- Uses multi-stage build (smaller final image)
- Installs dependencies in stage 1
- Creates production image in stage 2
- Runs as non-root user (security)
- Exposes port 3000
- Runs database migrations then starts server

### 2. docker-compose.yml

**Location:** `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine       # Use official PostgreSQL
    container_name: digifix-postgres
    environment:
      POSTGRES_USER: digifix
      POSTGRES_PASSWORD: digifix123
      POSTGRES_DB: digifix_db
    ports:
      - "5432:5432"                 # Host:Container
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: digifix-backend
    environment:
      DATABASE_URL: postgresql://digifix:digifix123@postgres:5432/digifix_db
      JWT_SECRET: secret-key
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy   # Wait for DB
```

**What it does:**
- Defines 2 services: `postgres` and `backend`
- Sets up networking (containers can talk)
- Manages volumes (data persistence)
- Sets environment variables
- Maps ports (host:container)

### 3. .dockerignore

**Location:** `backend/.dockerignore`

```
node_modules
npm-debug.log
.env
.git
.DS_Store
*.md
```

**What it does:**
- Excludes files from Docker build
- Reduces image size
- Protects sensitive files

---

## 🔥 Advanced Docker Commands

### Networking

```powershell
# List networks
docker network ls

# Inspect network
docker network inspect digifix-car-marketplace_digifix-network

# Create network
docker network create my-network

# Connect container to network
docker network connect my-network container-name
```

### Volumes

```powershell
# List volumes
docker volume ls

# Inspect volume
docker volume inspect digifix-car-marketplace_postgres_data

# Remove volume
docker volume rm volume-name

# Remove unused volumes
docker volume prune
```

### Resource Monitoring

```powershell
# Real-time resource usage
docker stats

# Container processes
docker top digifix-backend

# Container resource limits
docker update --memory 512m digifix-backend
```

### Backup & Restore

```powershell
# Backup PostgreSQL database
docker exec digifix-postgres pg_dump -U digifix digifix_db > backup.sql

# Restore database
Get-Content backup.sql | docker exec -i digifix-postgres psql -U digifix digifix_db

# Export container as image
docker commit digifix-backend my-backup-image

# Save image to file
docker save my-backup-image > backup.tar
```

---

## ✅ Best Practices

### 1. **Use .dockerignore**
Exclude unnecessary files to reduce build time and image size.

### 2. **Multi-stage Builds**
Reduce final image size by separating build and runtime stages.

### 3. **Non-root User**
Run containers as non-root for security.

### 4. **Environment Variables**
Never hardcode secrets - use `.env` files.

### 5. **Health Checks**
Monitor container health automatically.

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1
```

### 6. **Named Volumes**
Use named volumes for important data persistence.

### 7. **Small Base Images**
Use Alpine Linux variants (smaller, faster).

```dockerfile
FROM node:20-alpine  # ✅ Small
FROM node:20         # ❌ Large
```

---

## 📖 Learning Resources

### Official Documentation
- **Docker Docs:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/
- **Dockerfile Reference:** https://docs.docker.com/engine/reference/builder/

### Interactive Tutorials
- **Play with Docker:** https://labs.play-with-docker.com/
- **Docker Tutorial:** https://www.docker.com/101-tutorial/

### Video Courses
- **freeCodeCamp Docker Tutorial:** YouTube (Free)
- **Docker Mastery Course:** Udemy
- **Docker for Developers:** Pluralsight

### Books
- *Docker Deep Dive* by Nigel Poulton
- *Docker in Action* by Jeff Nickoloff

### Practice Projects
1. Containerize a simple Node.js app
2. Add PostgreSQL database with Docker Compose
3. Create multi-container applications
4. Deploy to cloud (AWS, Azure, GCP)

### Community
- **Docker Forums:** https://forums.docker.com/
- **Stack Overflow:** Tag: `docker`
- **Reddit:** r/docker

---

## 🎓 Learning Path

### Week 1: Basics
- [ ] Understand containers vs VMs
- [ ] Install Docker Desktop
- [ ] Run your first container
- [ ] Learn basic commands (run, stop, rm)

### Week 2: Images & Dockerfiles
- [ ] Create a simple Dockerfile
- [ ] Build an image
- [ ] Understand layers
- [ ] Push to Docker Hub

### Week 3: Docker Compose
- [ ] Create docker-compose.yml
- [ ] Run multi-container apps
- [ ] Understand networking
- [ ] Work with volumes

### Week 4: Advanced Topics
- [ ] Multi-stage builds
- [ ] Health checks
- [ ] Resource limits
- [ ] Security best practices

---

## 🛠️ Quick Reference Cheatsheet

| Task | Command |
|------|---------|
| **Start containers** | `docker-compose up -d` |
| **Stop containers** | `docker-compose down` |
| **View logs** | `docker-compose logs -f` |
| **Enter container** | `docker exec -it container-name sh` |
| **Check versions** | `docker exec container-name node --version` |
| **List packages** | `docker exec container-name npm list` |
| **Rebuild** | `docker-compose up -d --build` |
| **Clean up** | `docker system prune` |
| **Database backup** | `docker exec postgres pg_dump -U user db > backup.sql` |
| **View processes** | `docker-compose top` |

---

**Happy Dockerizing! 🐳**
