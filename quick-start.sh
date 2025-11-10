#!/bin/bash

# Quick Start Script for Testing Camera Kit Integration

set -e

echo "🚀 Camera Kit Integration - Quick Start"
echo ""

# Check if .env.local exists
if [ ! -f "frontend/.env.local" ]; then
    echo "❌ frontend/.env.local not found"
    echo "📝 Creating from template..."
    cp frontend/.env.template frontend/.env.local
    echo "✅ Created frontend/.env.local"
    echo ""
    echo "⚠️  IMPORTANT: Edit frontend/.env.local and add your Camera Kit API token!"
    echo "   Get it from: https://kit.snapchat.com/portal/"
    echo ""
    read -p "Press Enter after you've added your API token..."
fi

# Check dependencies
echo "📦 Checking dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
cd ..

cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi
cd ..

# Check if backend is running
echo ""
echo "🔍 Checking backend..."
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend not running. Starting backend..."
    cd backend
    npm start &
    BACKEND_PID=$!
    echo "Backend started (PID: $BACKEND_PID)"
    echo "Waiting for backend to be ready..."
    sleep 3
    cd ..
fi

# Build frontend to check for errors
echo ""
echo "🔨 Building frontend (checking for errors)..."
cd frontend
npm run build
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure frontend/.env.local has your Camera Kit API token"
echo "2. Create a Lens in Lens Studio (see LENS_SETUP.md)"
echo "3. Add Lens ID and Lens Group ID to frontend/.env.local"
echo "4. Start frontend: cd frontend && npm run dev"
echo "5. Open browser to the URL shown (usually https://localhost:5173)"
echo ""
echo "📚 See TESTING_GUIDE.md for detailed testing instructions"

