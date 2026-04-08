#!/bin/bash

# Simple API Test Script
# Run this after starting "vercel dev" to test your APIs

echo "🧪 Testing APIs..."
echo ""

BASE_URL="http://localhost:3000/api"

# Test 1: Health Check
echo "1️⃣ Testing health check..."
curl -s "$BASE_URL/core?action=health" | jq '.'
echo ""

# Test 2: Get Subjects
echo "2️⃣ Testing subjects..."
curl -s "$BASE_URL/core?action=subjects" | jq '.data.subjects[] | {key, name}'
echo ""

# Test 3: Login
echo "3️⃣ Testing login..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth?action=login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"password123"}' \
  | jq -r '.data.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Login successful! Token: ${TOKEN:0:20}..."
  echo ""
  
  # Test 4: Get Questions (with auth)
  echo "4️⃣ Testing questions list (authenticated)..."
  curl -s "$BASE_URL/content?action=questions-list&page=1&pageSize=5" \
    -H "Authorization: Bearer $TOKEN" \
    | jq '.data.pagination'
  echo ""
  
  echo "✅ All tests passed!"
else
  echo "❌ Login failed. Make sure:"
  echo "   1. vercel dev is running"
  echo "   2. Database is accessible"
  echo "   3. User exists in database"
fi
