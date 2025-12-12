@echo off
echo Starting NoteOL with Docker...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b
)

echo Building and starting services...
docker-compose up -d --build

echo.
echo Services started!
echo App is running at: http://localhost:3000
echo Database is running on port 5432
echo.
echo To stop the services, run: docker-compose down
pause
