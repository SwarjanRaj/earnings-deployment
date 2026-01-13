#!/bin/bash

# VPS Deployment Script for Earnings App
# Usage: ./deploy-vps.sh

set -e

echo "🚀 Starting VPS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.prod.yml not found!${NC}"
    exit 1
fi

# Check if nginx/default.conf exists
if [ ! -f "nginx/default.conf" ]; then
    echo -e "${RED}❌ Error: nginx/default.conf not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  Before proceeding, make sure you have:${NC}"
echo "   1. Updated 'yourdomain.com' in nginx/default.conf"
echo "   2. Updated GOOGLE_CALLBACK_URL in docker-compose.prod.yml"
echo "   3. Added callback URL in Google Cloud Console"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Stop existing containers
echo -e "${YELLOW}📦 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Test health endpoint
echo -e "${YELLOW}🏥 Testing health endpoint...${NC}"
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed! Check logs with: docker-compose -f docker-compose.prod.yml logs${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Point your domain DNS to this server's IP"
echo "   2. Test: curl http://yourdomain.com/health"
echo "   3. View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   4. Setup SSL: See DEPLOYMENT_VPS.md Step 6"
echo ""


