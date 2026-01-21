#!/bin/bash

# AI Customer Support Agent - Start Script
# This script initializes and starts the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         AI Customer Support Agent - Startup Script           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Define ports
BACKEND_PORT=5001
FRONTEND_PORT=3000

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check PostgreSQL connection
check_postgres() {
    if command_exists psql; then
        if psql -h localhost -U postgres -c '\q' 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

echo -e "${YELLOW}Step 1: Cleaning up used ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo -e "${GREEN}✓ Ports cleaned${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking prerequisites...${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js v18 or later.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"

# Check npm
if ! command_exists npm; then
    echo -e "${RED}✗ npm is not installed.${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"

# Check .env file in root folder
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_support?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# OpenRouter API Key (required for AI features)
OPENROUTER_API_KEY="your-openrouter-api-key-here"

# AI Model (optional, defaults to claude-3-haiku)
AI_MODEL="anthropic/claude-3-haiku"

# Server
PORT=5001
APP_URL="http://localhost:3000"
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Please update the OPENROUTER_API_KEY in .env with your actual key${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""

echo -e "${YELLOW}Step 3: Installing backend dependencies...${NC}"
cd backend
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 4: Setting up database...${NC}"
# Generate Prisma client
npm run db:generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Push schema to database
echo -e "${YELLOW}Pushing schema to database...${NC}"
npm run db:push || {
    echo -e "${RED}Database connection failed. Please ensure PostgreSQL is running.${NC}"
    echo -e "${YELLOW}You can start PostgreSQL with: brew services start postgresql${NC}"
    echo -e "${YELLOW}Or create the database manually: createdb ai_support${NC}"
    exit 1
}
echo -e "${GREEN}✓ Database schema pushed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Seeding database with sample data...${NC}"
npm run db:seed
echo -e "${GREEN}✓ Database seeded with sample data${NC}"
echo ""

cd ..

echo -e "${YELLOW}Step 6: Installing frontend dependencies...${NC}"
cd frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

cd ..

echo -e "${YELLOW}Step 7: Starting application...${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}Starting backend server on port $BACKEND_PORT...${NC}"
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"

# Start frontend in background
echo -e "${BLUE}Starting frontend server on port $FRONTEND_PORT...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Frontend failed to start${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend running (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 Application Started Successfully              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  Frontend:  http://localhost:$FRONTEND_PORT                        ║"
echo "║  Backend:   http://localhost:$BACKEND_PORT                         ║"
echo "║  API Docs:  http://localhost:$BACKEND_PORT/api/health              ║"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Login Credentials:                                          ║"
echo "║  Email:    admin@company.com                                 ║"
echo "║  Password: password123                                       ║"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Press Ctrl+C to stop all services                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}✓ Services stopped${NC}"
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
