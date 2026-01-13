# EarningsApp Backend

A microservices-based backend architecture built with NestJS, featuring authentication, user management, and stock data processing.

## 🏗️ Architecture

The backend consists of multiple microservices:

- **Gateway Service** (Port 3000) - API Gateway that routes requests to appropriate microservices
- **Auth Service** (Port 3001) - Handles authentication, OAuth, and user management
- **Admin Service** (Port 3002) - Manages user roles, stock data, and administrative functions
- **PostgreSQL** (Port 5434) - Primary database
- **Redis** (Port 6379) - Session storage and caching

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### 1. Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install dependencies for all services
cd authservice2 && npm install
cd ../adminservice && npm install  
cd ../gateway && npm install
cd ..
```

### 2. Start All Services

```bash
# Start all services
docker compose up -d
```

### 3. Seed the Superadmin User

**Important:** Both authservice and adminservice use different databases, so you must seed the superadmin in both services.

```bash
# Seed Auth Service database
docker compose exec auth-service node prisma/seed.js

# Seed Admin Service database  
docker compose exec adminservice node prisma/seed.js
```

### 4. Verify Services Are Running

```bash
# Check service status
docker compose ps

# View logs
docker compose logs

# Test gateway health
curl http://localhost:3000/api/stock/test
```

### 5. Access the Application

- **Gateway API:** http://localhost:3000
- **Auth Service:** http://localhost:3001
- **Admin Service:** http://localhost:3002
- **PostgreSQL:** localhost:5434
- **Redis:** localhost:6379

## 🔐 Default Admin User

After seeding, you can login with:
- **Email:** `sadmin@admin.com`
- **Password:** `Superadmin123!`
- **Role:** `SUPERADMIN`

## 📡 API Documentation

All requests should go through the gateway at `http://localhost:3000/api/`

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/verify` - Verify email
- `POST /api/auth/forgot` - Request password reset
- `POST /api/auth/reset` - Reset password
- `GET /api/auth/oauth/google` - Google OAuth
- `GET /api/auth/oauth/google/callback` - OAuth callback

### User Management
- `GET /api/users/me` - Get current user
- `GET /api/admin/users` - Get all users (Admin only)
- `PATCH /api/admin/promote` - Promote user (Admin only)
- `PATCH /api/admin/demote` - Demote user (Admin only)
- `PATCH /api/admin/set-role` - Set user role (Admin only)

### Stock Management
- `POST /api/stock/upload` - Upload stock data
- `GET /api/stock` - Get stock data
- `POST /api/stock/add` - Add stock record
- `DELETE /api/stock/:id` - Delete stock record
- `GET /api/stock/today` - Get today's earnings
- `GET /api/stock/yesterday` - Get yesterday's earnings
- `GET /api/stock/tomorrow` - Get tomorrow's earnings
- `GET /api/stock/this-week` - Get this week's earnings
- `GET /api/stock/next-week` - Get next week's earnings
- `GET /api/stock/public-preview` - Get public preview data

## 🐳 Docker Commands

### Service Management
```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d auth-service

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Rebuild and start
docker compose up --build -d

# Rebuild specific service
docker compose build auth-service
docker compose up -d auth-service

# Rebuild gateway (if port configuration changes)
docker compose build gateway
docker compose up -d gateway
```

### Logs
```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs auth-service
docker compose logs adminservice
docker compose logs gateway

# Follow logs in real-time
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100
```

### Database Operations
```bash
# Access PostgreSQL
docker exec postgres psql -U postgres -d authdb
docker exec postgres psql -U postgres -d admindb

# Run migrations (Auth Service)
docker compose exec auth-service npx prisma migrate deploy

# Run migrations (Admin Service)
docker compose exec adminservice npx prisma migrate deploy

# Seed database (Auth Service)
docker compose exec auth-service node prisma/seed.js

# Seed database (Admin Service)
docker compose exec adminservice node prisma/seed.js

# Check users in Auth Service database
docker exec postgres psql -U postgres -d authdb -c "SELECT email, username, role, \"isVerified\" FROM \"User\" LIMIT 5;"

# Check users in Admin Service database
docker exec postgres psql -U postgres -d admindb -c "SELECT email, username, role FROM \"User\" LIMIT 5;"

# Check earnings data
docker exec postgres psql -U postgres -d admindb -c "SELECT ticker, \"companyName\", \"earningsDate\", eps FROM \"FinancialRecord\" LIMIT 5;"

# Count users in Auth Service
docker exec postgres psql -U postgres -d authdb -c "SELECT COUNT(*) FROM \"User\";"

# Count users in Admin Service
docker exec postgres psql -U postgres -d admindb -c "SELECT COUNT(*) FROM \"User\";"

# Count earnings records
docker exec postgres psql -U postgres -d admindb -c "SELECT COUNT(*) FROM \"FinancialRecord\";"
```

### Container Management
```bash
# List containers
docker compose ps

# Execute commands in container
docker compose exec auth-service sh
docker compose exec adminservice sh
docker compose exec gateway sh

# View container resources
docker stats

# Check container port mappings
docker port backend-gateway-1
docker port backend-auth-service-1
docker port backend-adminservice-1
```

## 🔧 Development

### Local Development Setup

1. **Install dependencies for each service:**
   ```bash
   cd authservice2 && npm install
   cd ../adminservice && npm install
   cd ../gateway && npm install
   ```

2. **Set up environment variables:**
   Create `.env` files in each service directory with appropriate database URLs and secrets.

3. **Start services individually:**
   ```bash
   # Start PostgreSQL and Redis
   docker compose up -d postgres redis
   
   # Start services in separate terminals
   cd authservice2 && npm run start:dev
   cd adminservice && npm run start:dev
   cd gateway && npm run start:dev
   ```

### Database Management

```bash
# Create new migration
cd authservice2 && npx prisma migrate dev --name migration_name

# Reset database
cd authservice2 && npx prisma migrate reset

# Open Prisma Studio
cd authservice2 && npx prisma studio
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :3001
   lsof -i :3002
   
   # Kill the process
   kill -9 <PID>
   ```

2. **Database Connection Issues**
   ```bash
   # Check if PostgreSQL is running
   docker compose ps postgres
   
   # Check database logs
   docker compose logs postgres
   
   # Restart database
   docker compose restart postgres
   ```

3. **Service Won't Start**
   ```bash
   # Check service logs
   docker compose logs <service-name>
   
   # Rebuild service
   docker compose build --no-cache <service-name>
   docker compose up -d <service-name>
   ```

4. **Gateway Port Issues**
   ```bash
   # Check if gateway is listening on correct port
   docker exec backend-gateway-1 netstat -tlnp
   
   # Rebuild gateway if needed
   docker compose build gateway
   docker compose up -d gateway
   ```

5. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   chmod +x */docker-entrypoint.sh
   ```

6. **Authentication Issues (401 Errors)**
   ```bash
   # Make sure both services are seeded
   docker compose exec auth-service node prisma/seed.js
   docker compose exec adminservice node prisma/seed.js
   
   # Check if user exists in both databases
   docker exec postgres psql -U postgres -d authdb -c "SELECT email, username, role FROM \"User\" WHERE email = 'sadmin@admin.com';"
   docker exec postgres psql -U postgres -d admindb -c "SELECT email, username, role FROM \"User\" WHERE email = 'sadmin@admin.com';"
   ```

7. **Database Query Issues**
   ```bash
   # If docker-compose exec fails, use direct docker exec
   # Get container IDs
   docker ps
   
   # Use container IDs instead of service names
   docker exec <container-id> <command>
   
   # Example: Check auth service users
   docker exec postgres psql -U postgres -d authdb -c "SELECT COUNT(*) FROM \"User\";"
   ```

### Reset Everything

```bash
# Stop all services
docker compose down

# Remove all containers and volumes
docker compose down -v

# Remove all images
docker rmi $(docker images -q)

# Start fresh
docker compose up --build -d

# Re-seed both databases
docker compose exec auth-service node prisma/seed.js
docker compose exec adminservice node prisma/seed.js
```

## 📁 Project Structure

```
backend/
├── docker-compose.yml          # Main Docker Compose file
├── authservice2/               # Authentication service
│   ├── src/
│   ├── prisma/
│   │   └── seed.js            # Seed script for auth service
│   └── Dockerfile
├── adminservice/               # Admin and stock management service
│   ├── src/
│   │   └── prisma/
│   │       └── seed.js        # Seed script for admin service
│   └── Dockerfile
├── gateway/                    # API Gateway
│   ├── src/
│   └── Dockerfile
└── data/                       # Database data
    ├── postgres/
    └── redis/
```

## 🔐 Environment Variables

### Auth Service (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/authdb
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRATION=15m
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/oauth/google/callback
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Admin Service (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/admindb
JWT_SECRET=your_jwt_secret_key
PORT=3002
```

### Gateway (configured in docker-compose.yml)
```env
PORT=3000
AUTHSERVICE_HOST=auth-service
AUTHSERVICE_PORT=3001
ADMINSERVICE_HOST=adminservice
ADMINSERVICE_PORT=3002
``` 