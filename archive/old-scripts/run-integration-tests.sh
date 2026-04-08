#!/bin/bash

# Integration Test Runner Script
# This script sets up and runs integration tests against the real database

set -e  # Exit on error

echo "🚀 Starting Integration Test Suite"
echo "=================================="
echo ""

# Check if dev server is running
echo "📡 Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Dev server is running"
else
    echo "❌ Dev server is not running!"
    echo ""
    echo "Please start the dev server in another terminal:"
    echo "  npm run dev"
    echo ""
    exit 1
fi

# Check database connection
echo ""
echo "🔌 Checking database connection..."
if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database connected"
else
    echo "❌ Database connection failed!"
    echo "Check your .env.local file"
    exit 1
fi

# Seed database
echo ""
echo "🌱 Seeding test database..."
npm run db:seed

if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
else
    echo "❌ Database seeding failed!"
    exit 1
fi

# Run integration tests
echo ""
echo "🧪 Running integration tests..."
echo ""
npm run test:integration

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================="
    echo "✅ All integration tests passed!"
    echo "=================================="
else
    echo ""
    echo "=================================="
    echo "❌ Some integration tests failed"
    echo "=================================="
    exit 1
fi
