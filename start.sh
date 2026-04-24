#!/bin/bash

# AI Customer Support Agent - Start Script with Hot Reload
# This script initializes and starts the application with code monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     AI Customer Support Agent - Startup Script v2.0          ║"
echo "║              With Hot Reload & Full AI Features              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Define ports (avoiding port 5000 which is used by macOS AirPlay)
BACKEND_PORT=5001
FRONTEND_PORT=3000

# Function to kill process on a specific port
kill_port() {
    local port=$1
    echo -e "${YELLOW}Checking port $port...${NC}"

    # Try lsof first
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi

    # Also try fuser as backup
    if command -v fuser >/dev/null 2>&1; then
        fuser -k $port/tcp 2>/dev/null || true
    fi

    # Verify port is free
    if lsof -ti:$port >/dev/null 2>&1; then
        echo -e "${RED}Warning: Port $port may still be in use${NC}"
    else
        echo -e "${GREEN}✓ Port $port is free${NC}"
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${CYAN}Step 1: Cleaning up used ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
# Also clean up any other common ports that might conflict
kill_port 5002
kill_port 5003
echo -e "${GREEN}✓ Ports cleaned${NC}"
echo ""

echo -e "${CYAN}Step 2: Checking prerequisites...${NC}"

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
    cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_support?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# OpenRouter API Key (required for AI features)
OPENROUTER_API_KEY="your-openrouter-api-key-here"

# OpenRouter AI Model
OPENROUTER_MODEL="anthropic/claude-haiku-4.5"

# Server Configuration (avoiding port 5000 - used by macOS AirPlay)
PORT=5001
APP_URL="http://localhost:3000"

# Twilio Configuration (optional - for voice features)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Please update the OPENROUTER_API_KEY in .env with your actual key${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""

echo -e "${CYAN}Step 3: Installing backend dependencies...${NC}"
cd backend

# Install nodemon globally for hot reloading if not present
if ! command_exists nodemon; then
    echo -e "${YELLOW}Installing nodemon for hot reload...${NC}"
    npm install -g nodemon
fi

npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

echo -e "${CYAN}Step 4: Setting up database...${NC}"
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

echo -e "${CYAN}Step 5: Seeding database with sample data...${NC}"
npm run db:seed
echo -e "${GREEN}✓ Database seeded with sample data (15+ items per feature)${NC}"
echo ""

cd ..

echo -e "${CYAN}Step 6: Installing frontend dependencies...${NC}"
cd frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

cd ..

echo -e "${CYAN}Step 7: Starting application with hot reload...${NC}"
echo ""

# Start backend with nodemon for hot reload
echo -e "${BLUE}Starting backend server on port $BACKEND_PORT with hot reload...${NC}"
cd backend
npx nodemon --watch src --ext js,json src/index.js &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend running with hot reload (PID: $BACKEND_PID)${NC}"

# Start frontend with Vite dev server (has built-in hot reload)
echo -e "${BLUE}Starting frontend server on port $FRONTEND_PORT with hot reload...${NC}"
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
echo -e "${GREEN}✓ Frontend running with hot reload (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Application Started Successfully                 ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  Frontend:  http://localhost:$FRONTEND_PORT                        ║"
echo "║  Backend:   http://localhost:$BACKEND_PORT                         ║"
echo "║  API Docs:  http://localhost:$BACKEND_PORT/api/health              ║"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  🔥 HOT RELOAD ENABLED                                       ║"
echo "║  Backend: nodemon watching src/ folder                       ║"
echo "║  Frontend: Vite HMR (Hot Module Replacement)                 ║"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Login Credentials:                                          ║"
echo "║  Email:    admin@company.com                                 ║"
echo "║  Password: password123                                       ║"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  🤖 AI Features (OpenRouter):                                ║"
echo "║  - AI Ticket Classifier                                      ║"
echo "║  - AI Resolution Predictor                                   ║"
echo "║  - AI Knowledge Suggester                                    ║"
echo "║  - AI Quality Scorer                                         ║"
echo "║  - AI Escalation Router                                      ║"
echo "║  - AI Shopping Assistant                                     ║"
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
