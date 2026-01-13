#!/bin/sh
set -e

echo "🚀 Starting Admin Service..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "✅ Database is ready!"

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Start the application
echo "🎯 Starting Admin Service on port 3002..."
exec npm run start:prod