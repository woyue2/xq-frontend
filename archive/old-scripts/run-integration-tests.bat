@echo off
REM Integration Test Runner Script for Windows
REM This script sets up and runs integration tests against the real database

echo.
echo Starting Integration Test Suite
echo ==================================
echo.

REM Check if dev server is running
echo Checking if dev server is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo Dev server is running
) else (
    echo Dev server is not running!
    echo.
    echo Please start the dev server in another terminal:
    echo   npm run dev
    echo.
    exit /b 1
)

REM Seed database
echo.
echo Seeding test database...
call npm run db:seed
if %errorlevel% neq 0 (
    echo Database seeding failed!
    exit /b 1
)
echo Database seeded successfully

REM Run integration tests
echo.
echo Running integration tests...
echo.
call npm run test:integration

if %errorlevel% equ 0 (
    echo.
    echo ==================================
    echo All integration tests passed!
    echo ==================================
) else (
    echo.
    echo ==================================
    echo Some integration tests failed
    echo ==================================
    exit /b 1
)
