#!/bin/bash

# Deployment Verification Script
# Run this after deployment to check everything is working

echo "🔍 Checking Earnings App Deployment..."
echo "========================================"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check service
check_service() {
    local service=$1
    if docker-compose -f docker-compose.prod.yml ps $service | grep -q "Up"; then
        echo -e "${GREEN}✅ $service: RUNNING${NC}"
        return 0
    else
        echo -e "${RED}❌ $service: NOT RUNNING${NC}"
        return 1
    fi
}

# Check if docker-compose file exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ docker-compose.prod.yml not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}🐳 Checking Docker Services:${NC}"

# Check all services
services=("postgres" "redis" "auth-service" "adminservice" "gateway" "frontend" "nginx")
failed_services=0

for service in "${services[@]}"; do
    if ! check_service $service; then
        failed_services=$((failed_services + 1))
    fi
done

echo
echo -e "${YELLOW}🌐 Checking Network Connectivity:${NC}"

# Check health endpoint
if curl -f -s http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Internal health check: PASSED${NC}"
else
    echo -e "${RED}❌ Internal health check: FAILED${NC}"
    failed_services=$((failed_services + 1))
fi

# Check nginx configuration
if docker exec nginx nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx configuration: VALID${NC}"
else
    echo -e "${RED}❌ Nginx configuration: INVALID${NC}"
    failed_services=$((failed_services + 1))
fi

echo
echo -e "${YELLOW}📁 Checking Configuration Files:${NC}"

# Check environment file
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✅ .env.production: EXISTS${NC}"

    # Check for placeholder values
    if grep -q "YOUR_" .env.production; then
        echo -e "${YELLOW}⚠️  WARNING: .env.production contains placeholder values${NC}"
        echo "   Update these before going to production!"
    fi
else
    echo -e "${RED}❌ .env.production: MISSING${NC}"
    failed_services=$((failed_services + 1))
fi

# Check nginx config for subdomain
if grep -q "earnings.sdnsoftech.info" nginx/default.conf; then
    echo -e "${GREEN}✅ Nginx subdomain config: CORRECT${NC}"
else
    echo -e "${RED}❌ Nginx subdomain config: INCORRECT${NC}"
    echo "   Update nginx/default.conf with earnings.sdnsoftech.info"
    failed_services=$((failed_services + 1))
fi

echo
echo -e "${YELLOW}📊 System Resources:${NC}"

# Check disk space
disk_usage=$(df / | tail -1 | awk '{print $5}')
echo "Disk usage: $disk_usage"

# Check memory
if command -v free > /dev/null; then
    mem_usage=$(free | grep Mem | awk '{printf "%.0f%%", $3/$2 * 100.0}')
    echo "Memory usage: $mem_usage"
fi

echo
echo "========================================"

if [ $failed_services -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! Deployment successful.${NC}"
    echo
    echo -e "${GREEN}🌐 Your app should be accessible at:${NC}"
    echo "   https://earnings.sdnsoftech.info"
    echo
    echo -e "${YELLOW}Test credentials:${NC}"
    echo "   Email: sadmin@admin.com"
    echo "   Password: Superadmin123!"
else
    echo -e "${RED}❌ $failed_services issues found. Please fix them.${NC}"
    echo
    echo -e "${YELLOW}🔧 Common fixes:${NC}"
    echo "   • Check logs: docker-compose -f docker-compose.prod.yml logs"
    echo "   • Restart services: docker-compose -f docker-compose.prod.yml restart"
    echo "   • Update environment: nano .env.production"
fi

echo
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "   View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   Restart all: docker-compose -f docker-compose.prod.yml restart"
echo "   Stop all: docker-compose -f docker-compose.prod.yml down"
echo "   Start all: docker-compose -f docker-compose.prod.yml up -d"