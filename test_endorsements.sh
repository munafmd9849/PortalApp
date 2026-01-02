#!/bin/bash

echo "🚀 Endorsement System Test Helper"
echo "=================================="
echo ""

# Check if backend is running
echo "Checking backend server..."
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:5000"
else
    echo "❌ Backend is NOT running"
    echo "   Start it with: cd backend && npm run dev"
    exit 1
fi

# Check if frontend is running
echo "Checking frontend server..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is running on http://localhost:5173"
else
    echo "❌ Frontend is NOT running"
    echo "   Start it with: cd frontend && npm run dev"
    exit 1
fi

# Check database
echo "Checking database..."
if [ -f "backend/prisma/dev.db" ]; then
    echo "✅ Database exists"
else
    echo "❌ Database missing"
    echo "   Run: cd backend && npx prisma db push"
    exit 1
fi

echo ""
echo "✅ All systems ready!"
echo ""
echo "📋 Testing Steps:"
echo "1. Login as student at http://localhost:5173"
echo "2. Go to 'Endorsements' tab"
echo "3. Click 'Request Endorsement'"
echo "4. Fill form and submit"
echo "5. Check email for magic link"
echo "6. Click link and submit endorsement"
echo "7. Verify it appears in dashboard"
echo ""
echo "📖 Full guide: TEST_ENDORSEMENT_SYSTEM.md"
