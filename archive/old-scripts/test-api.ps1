# Simple API Test Script for Windows PowerShell
# Run this after starting "vercel dev" to test your APIs

Write-Host "🧪 Testing APIs..." -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost:3000/api"

# Test 1: Health Check
Write-Host "1️⃣ Testing health check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/core?action=health" -Method Get
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get Subjects
Write-Host "2️⃣ Testing subjects..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/core?action=subjects" -Method Get
    Write-Host "✅ Subjects loaded!" -ForegroundColor Green
    $response.data.subjects | Select-Object key, name | Format-Table
} catch {
    Write-Host "❌ Subjects failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Login
Write-Host "3️⃣ Testing login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        phone = "13800138000"
        password = "password123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth?action=login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.data.token
    
    if ($token) {
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
        Write-Host ""
        
        # Test 4: Get Questions (with auth)
        Write-Host "4️⃣ Testing questions list (authenticated)..." -ForegroundColor Yellow
        $headers = @{
            Authorization = "Bearer $token"
        }
        
        $questionsResponse = Invoke-RestMethod -Uri "$BaseUrl/content?action=questions-list&page=1&pageSize=5" `
            -Method Get `
            -Headers $headers
        
        Write-Host "✅ Questions loaded!" -ForegroundColor Green
        $questionsResponse.data.pagination | Format-List
        
        Write-Host ""
        Write-Host "✅ All tests passed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Login failed: No token received" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. vercel dev is running" -ForegroundColor Gray
    Write-Host "  2. Database is accessible" -ForegroundColor Gray
    Write-Host "  3. User exists in database" -ForegroundColor Gray
}
