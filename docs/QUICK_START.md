# Quick Start Guide - Migration Package

## 🎯 What's Included

Complete migration package from Firebase to PostgreSQL + Express + Socket.IO with:
- ✅ Prisma schema (PostgreSQL/SQLite)
- ✅ Express backend (routes, controllers, middleware)
- ✅ BullMQ workers (job distribution, emails)
- ✅ Socket.IO setup (real-time updates)
- ✅ Frontend API service (replaces Firebase SDK)
- ✅ Data migration scripts
- ✅ Complete documentation

---

## ⚡ 5-Minute Setup

### 1. Backend Setup

```bash
cd MIGRATION/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Setup database
npm run db:generate
npm run db:migrate

# Start server (Terminal 1)
npm run dev

# Start workers (Terminal 2)
npm run worker
```

### 2. Frontend Integration

```bash
# Copy migration files to your frontend
cp MIGRATION/frontend/src/services/api.js src/services/
cp MIGRATION/frontend/src/services/socket.js src/services/

# Update AuthContext
cp MIGRATION/frontend/src/context/AuthContext.migrated.jsx src/context/AuthContext.jsx

# Add environment variables
echo "VITE_API_URL=http://localhost:3000/api" >> .env
echo "VITE_SOCKET_URL=http://localhost:3000" >> .env
```

### 3. Test Connection

```bash
# Backend should respond
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

## 📝 File Structure

```
MIGRATION/
├── prisma/
│   └── schema.prisma              # Database schema
├── backend/
│   ├── src/
│   │   ├── config/                # DB, Redis, S3, Email, Socket
│   │   ├── middleware/            # Auth, roles, validation
│   │   ├── controllers/           # Business logic
│   │   ├── routes/                # API endpoints
│   │   ├── workers/               # Background jobs
│   │   └── server.js              # Express server
│   └── package.json
├── frontend/
│   └── src/
│       ├── services/
│       │   ├── api.js             # HTTP client
│       │   └── socket.js          # WebSocket client
│       ├── hooks/
│       │   └── useAPI.js          # React hooks
│       └── context/
│           └── AuthContext.migrated.jsx
├── scripts/
│   └── migrate-firestore-to-postgres.js
├── EXAMPLES/
│   └── StudentDashboard.migrated.jsx
├── MIGRATION_GUIDE.md             # Detailed guide
├── MIGRATION_SUMMARY.md           # Quick reference
├── API_DOCUMENTATION.md           # API reference
├── ARCHITECTURE_DIAGRAMS.md       # Architecture docs
└── QUICK_START.md                 # This file
```

---

## 🔄 Key Changes

### Frontend Code

**Before:**
```javascript
import { getStudentProfile } from '../services/students';
const profile = await getStudentProfile(userId);
```

**After:**
```javascript
import api from '../services/api';
const profile = await api.getStudentProfile();
```

### Real-Time Updates

**Before:**
```javascript
const unsubscribe = onSnapshot(query, (snapshot) => {
  setData(snapshot.docs.map(doc => doc.data()));
});
```

**After:**
```javascript
import { subscribeToUpdates } from '../services/socket';
const unsubscribe = subscribeToUpdates({
  onApplicationUpdated: (data) => setData(prev => [...prev, data]),
});
```

---

## ✅ Verification Steps

1. ✅ Backend starts without errors
2. ✅ Database connection works
3. ✅ Redis connection works
4. ✅ Frontend connects to API
5. ✅ Socket.IO connection established
6. ✅ Authentication works
7. ✅ Data migration completes

---

## 📚 Documentation

- **MIGRATION_GUIDE.md** - Complete step-by-step instructions
- **API_DOCUMENTATION.md** - All API endpoints with examples
- **MIGRATION_SUMMARY.md** - Quick reference and mappings
- **ARCHITECTURE_DIAGRAMS.md** - System architecture diagrams

---

**Ready to migrate?** Start with `MIGRATION_GUIDE.md` for detailed instructions!
