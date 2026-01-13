# Gateway Service

A NestJS API Gateway that routes requests to appropriate microservices and handles cross-cutting concerns like authentication, logging, and request/response transformation.

## 🚀 Features

- API Gateway routing to microservices
- Request/response transformation
- Cookie forwarding and management
- CORS handling
- Authentication proxy
- OAuth callback handling
- Load balancing (future)

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Auth Service (Port 3001)
- Admin Service (Port 3002)

## 🛠️ Setup & Installation

### Option 1: Docker (Recommended)

1. **Install dependencies:**
   ```bash
   cd backend/gateway
   npm install
   ```

2. **Start all services:**
   ```bash
   cd ..
   docker compose up -d
   ```

### Option 2: Local Development

1. **Install dependencies:**
   ```bash
   cd backend/gateway
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `gateway` directory:
   ```env
   PORT=3000
   AUTHSERVICE_HOST=auth-service
   AUTHSERVICE_PORT=3001
   ADMINSERVICE_HOST=adminservice
   ADMINSERVICE_PORT=3002
   ```

3. **Start the development server:**
   ```bash
   npm run start:dev
   ```

## 🐳 Docker Commands

### Service Management
```bash
# Build the service
docker compose build gateway

# Start the service
docker compose up -d gateway

# Rebuild and restart (if port configuration changes)
docker compose build gateway
docker compose up -d gateway

# View logs
docker compose logs gateway

# Execute commands in container
docker compose exec gateway sh

# Check if gateway is listening on correct port
docker exec backend-gateway-1 netstat -tlnp
```

### Health Checks
```bash
# Test gateway health
curl http://localhost:3000/api/stock/test

# Check container status
docker compose ps gateway

# View real-time logs
docker compose logs -f gateway
```

## 📡 API Endpoints

The Gateway acts as a reverse proxy and routes requests to the appropriate microservices:

### Authentication Routes (→ Auth Service)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/verify` - Verify email
- `POST /api/auth/forgot` - Request password reset
- `POST /api/auth/reset` - Reset password
- `GET /api/auth/oauth/google` - Google OAuth
- `GET /api/auth/oauth/google/callback` - OAuth callback

### User Management Routes (→ Auth Service)
- `GET /api/users/me` - Get current user

### Admin Routes (→ Admin Service)
- `GET /api/admin/users` - Get all users (Admin only)
- `PATCH /api/admin/promote` - Promote user (Admin only)
- `PATCH /api/admin/demote` - Demote user (Admin only)
- `PATCH /api/admin/set-role` - Set user role (Admin only)
- `GET /api/admin/login-activity/:email` - Get login activity logs

### Stock Management Routes (→ Admin Service)
- `POST /api/stock/upload` - Upload stock data
- `POST /api/stock/upload-earnings` - Upload earnings data
- `POST /api/stock/add` - Add stock record
- `POST /api/stock/bulk-upload` - Add multiple stock records
- `POST /api/stock/chunked-bulk-upsert` - Add stock records in chunks
- `GET /api/stock/all` - Get all stock data
- `GET /api/stock/search` - Search stock data
- `GET /api/stock/paginated` - Get paginated stock data
- `GET /api/stock/today` - Get today's earnings
- `GET /api/stock/yesterday` - Get yesterday's earnings
- `GET /api/stock/tomorrow` - Get tomorrow's earnings
- `GET /api/stock/this-week` - Get this week's earnings
- `GET /api/stock/next-week` - Get next week's earnings
- `GET /api/stock/public-preview` - Get public preview data
- `DELETE /api/stock/:id` - Delete stock record
- `PATCH /api/stock/:id` - Update stock record

### CSV Processing Routes (→ Admin Service)
- `POST /api/csv/upload` - Upload and process CSV files

## 🔧 Development

### Available Scripts

```bash
# Development
npm run start:dev

# Production
npm run start:prod

# Build
npm run build

# Test
npm run test

# Lint
npm run lint

# Format
npm run format
```

## 📊 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Gateway port | `3000` |
| `AUTHSERVICE_HOST` | Auth service hostname | `auth-service` |
| `AUTHSERVICE_PORT` | Auth service port | `3001` |
| `ADMINSERVICE_HOST` | Admin service hostname | `adminservice` |
| `ADMINSERVICE_PORT` | Admin service port | `3002` |

**Note:** These environment variables are configured in the `docker-compose.yml` file and do not require a separate `.env` file.

## 🚨 Troubleshooting

### Common Issues

1. **Service Connection Issues**
   ```bash
   # Check if dependent services are running
   docker compose ps auth-service adminservice
   
   # Check service logs
   docker compose logs auth-service
   docker compose logs adminservice
   
   # Restart services
   docker compose restart auth-service adminservice
   ```

2. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Kill the process
   kill -9 <PID>
   ```

3. **Gateway Not Listening on Port 3000**
   ```bash
   # Check container port mapping
   docker port backend-gateway-1
   
   # Check internal port binding
   docker exec backend-gateway-1 netstat -tlnp
   
   # Rebuild gateway if needed
   docker compose build gateway
   docker compose up -d gateway
   ```

4. **Cookie Issues**
   ```bash
   # Check if cookies are being forwarded properly
   docker compose logs gateway | grep -i cookie
   ```

5. **Environment Variable Issues**
   ```bash
   # Check environment variables in container
   docker exec backend-gateway-1 env | grep -E "PORT|AUTHSERVICE|ADMINSERVICE"
   ```

## 📁 Project Structure

```
gateway/
├── src/
│   ├── gateway.controller.ts  # Main gateway controller
│   ├── gateway.service.ts     # Gateway service logic
│   ├── app.module.ts          # Application module
│   └── main.ts                # Application entry point
├── proto/                     # gRPC protocol files
├── Dockerfile                 # Docker configuration
└── package.json               # Dependencies and scripts
```

## 🔗 Related Services

- **Auth Service:** Handles authentication and user management
- **Admin Service:** Manages user roles and stock data
- **Frontend:** React application consuming the API

## 🚀 Quick Test

After starting all services, test the gateway with:

```bash
# Health check
curl http://localhost:3000/api/stock/test

# Get stock data
curl http://localhost:3000/api/stock/all

# Test authentication
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  http://localhost:3000/api/auth/login
```
