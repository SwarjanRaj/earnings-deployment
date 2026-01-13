#!/bin/bash

# Environment Setup Script for Earnings App
# Run this on your VPS after transferring files

echo "🚀 Setting up Environment for Earnings App..."
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "env.production.example" ]; then
    echo -e "${RED}❌ Error: env.production.example not found!${NC}"
    echo "Make sure you're in the earnings-app directory"
    exit 1
fi

echo -e "${YELLOW}📋 Creating .env.production file...${NC}"

# Create .env.production with subdomain configuration
cat > .env.production << 'EOF'
# ============================================
# Gateway Configuration
# ============================================
PORT=3000
NODE_ENV=production
AUTHSERVICE_HOST=auth-service
AUTHSERVICE_PORT=3001
ADMINSERVICE_HOST=adminservice
ADMINSERVICE_PORT=3002

# gRPC Configuration
AUTH_GRPC_URL=auth-service:50051
ADMIN_GRPC_URL=adminservice:50052
AUTH_GRPC_PORT=50051
ADMIN_GRPC_PORT=50052

# CORS Origins (comma-separated)
CORS_ORIGINS=https://earnings.sdnsoftech.info,https://www.sdnsoftech.info

# ============================================
# Auth Service Configuration
# ============================================
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/authdb

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_MIN_32_CHARS
JWT_EXPIRATION=15m

# Google OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://earnings.sdnsoftech.info/api/auth/oauth/google/callback

# Email (Resend)
RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM=noreply@sdnsoftech.info

# ============================================
# Admin Service Configuration
# ============================================
# Database
ADMIN_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/admindb

# JWT (CHANGE THESE IN PRODUCTION!)
ADMIN_JWT_SECRET=YOUR_SUPER_SECURE_ADMIN_JWT_SECRET_MIN_32_CHARS
REFRESH_TOKEN_SECRET=YOUR_SUPER_SECURE_REFRESH_TOKEN_SECRET_MIN_32_CHARS
REFRESH_TOKEN_EXPIRATION=7d

# ============================================
# Node.js Optimization
# ============================================
NODE_OPTIONS=--max-old-space-size=1024
EOF

echo -e "${GREEN}✅ .env.production created successfully!${NC}"
echo
echo -e "${YELLOW}⚠️  IMPORTANT: You MUST update these values:${NC}"
echo "   1. JWT_SECRET (minimum 32 characters)"
echo "   2. ADMIN_JWT_SECRET (minimum 32 characters)"
echo "   3. REFRESH_TOKEN_SECRET (minimum 32 characters)"
echo "   4. GOOGLE_CLIENT_ID"
echo "   5. GOOGLE_CLIENT_SECRET"
echo "   6. RESEND_API_KEY"
echo
echo -e "${YELLOW}📝 Edit the file:${NC}"
echo "nano .env.production"
echo
echo -e "${GREEN}🎯 Next steps:${NC}"
echo "1. Update the secrets in .env.production"
echo "2. Configure DNS for earnings.sdnsoftech.info"
echo "3. Update nginx/default.conf with subdomain"
echo "4. Run: ./deploy-vps.sh"