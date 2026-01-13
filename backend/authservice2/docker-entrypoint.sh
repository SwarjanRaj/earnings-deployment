#!/bin/sh
set -e

echo "🚀 Starting Auth Service..."

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
echo "🎯 Starting Auth Service on port 3001..."
exec npm run start:prod