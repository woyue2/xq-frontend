version: "3.8"

services:
postgres:
image: postgres:16-alpine
container_name: kpqa-postgres
environment:
POSTGRES_USER: kpqa
POSTGRES_PASSWORD: kpqa_password
POSTGRES_DB: kpqa_db
volumes: - postgres_data:/var/lib/postgresql/data
command: >
postgres
-c max_connections=20
-c shared_buffers=128MB
-c work_mem=4MB
-c maintenance_work_mem=64MB
deploy:
resources:
limits:
cpus: "0.7"
memory: 384M
healthcheck:
test: ["CMD-SHELL", "pg_isready -U kpqa -d kpqa_db"]
interval: 10s
timeout: 5s
retries: 5

redis:
image: redis:7-alpine
container_name: kpqa-redis
command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
deploy:
resources:
limits:
cpus: "0.3"
memory: 160M
healthcheck:
test: ["CMD", "redis-cli", "ping"]
interval: 10s
timeout: 5s
retries: 5

backend:
build:
context: ../backend
dockerfile: Dockerfile
container_name: kpqa-backend
environment:
NODE_ENV: production
PORT: 3000
DATABASE_URL: postgresql://kpqa:kpqa_password@postgres:5432/kpqa_db?connection_limit=5
REDIS_URL: redis://redis:6379
JWT_SECRET: please-change-this-in-production
volumes: - ../backend:/app - backend_node_modules:/app/node_modules
working_dir: /app
command: sh -c "npm ci && npm run build && node dist/server.js"
ports: - "3000:3000"
depends_on:
postgres:
condition: service_healthy
redis:
condition: service_healthy
deploy:
resources:
limits:
cpus: "0.8"
memory: 512M
healthcheck:
test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
interval: 30s
timeout: 10s
retries: 3
start_period: 40s

volumes:
postgres_data:
backend_node_nodes:
