# 🚀 Starting the Servers

## Quick Start Guide

### Prerequisites Check

Before starting, you need:

1. **PostgreSQL Database** - The backend requires PostgreSQL
   - Option A: Local PostgreSQL (if installed)
   - Option B: Cloud PostgreSQL service (Supabase, Neon, etc.)
   - Option C: Docker PostgreSQL container

2. **Redis** (Optional) - Required for background workers
   - Can skip for now if you just want to test the API

3. **Web Search & AI Keys**
   - [Bing Web Search API](https://www.microsoft.com/en-us/bing/apis/bing-web-search-api) – copy the key into `backend/.env`:
     ```env
     BING_API_KEY=your-bing-key
     ```
   - (Optional) Large language model credentials for richer summaries:
     ```env
     # Use whichever provider you already rely on
     OPENAI_API_KEY=sk-...
     OPENAI_MODEL=gpt-4o-mini # optional override
     # or
     OLLAMA_API_URL=http://localhost:11434
     OLLAMA_MODEL=llama3.1
     ```

### Setup Database

**Option 1: Use a free cloud PostgreSQL service**

1. Sign up for [Supabase](https://supabase.com) or [Neon](https://neon.tech) (free tier)
2. Get your PostgreSQL connection string
3. Update `backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/database"
   ```

**Option 2: Use Docker PostgreSQL**

```bash
docker run --name portal-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=portal \
  -p 5432:5432 \
  -d postgres:15
```

Then update `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portal?schema=public"
```

**Option 3: Install PostgreSQL locally**

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15
createdb portal

# Then update backend/.env with connection string
```

---

## Starting the Servers

### Terminal 1: Backend Server

```bash
cd backend/

# Generate Prisma Client (if not done)
npm run db:generate

# Run database migrations (creates tables)
npm run db:migrate

# Start the backend server
npm run dev
```

**Expected output:**
```
🚀 Server running on port 3000
📡 Socket.IO enabled
🗄️  Database: PostgreSQL
```

**If you see database connection errors:**
- Check your `DATABASE_URL` in `backend/.env`
- Make sure PostgreSQL is running
- Run `npm run db:migrate` to create tables

---

### Terminal 2: Frontend Server

```bash
cd frontend/

# Start the frontend dev server
npm run dev
```

**Expected output:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Testing the Connection

### 1. Health Check

Open browser or use curl:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-11-19T..."}
```

### 2. Frontend Connection

1. Open http://localhost:5173 in your browser
2. Open browser DevTools (F12) → Console tab
3. Try to register/login
4. Check for API calls in Network tab

### 3. Test Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "STUDENT",
    "profile": {
      "fullName": "Test User",
      "enrollmentId": "TEST123",
      "school": "SOT",
      "center": "BANGALORE",
      "batch": "25-29"
    }
  }'
```

Expected response:
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "role": "STUDENT"
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

## Common Issues

### Issue: "Cannot connect to database"

**Solution:**
1. Check if PostgreSQL is running:
   ```bash
   # Check if PostgreSQL is running
   psql -U postgres -c "SELECT version();"
   ```

2. Verify `DATABASE_URL` in `backend/.env`

3. Run migrations:
   ```bash
   cd backend/
   npm run db:migrate
   ```

---

### Issue: "JWT_SECRET is required"

**Solution:**
Make sure `backend/.env` has:
```env
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
```

---

### Issue: Frontend can't connect to backend

**Solution:**
1. Check backend is running on port 3000
2. Check `frontend/.env` has:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_SOCKET_URL=http://localhost:3000
   ```
3. Restart frontend dev server after changing `.env`

---

### Issue: CORS errors

**Solution:**
Make sure `backend/.env` has:
```env
CORS_ORIGIN=http://localhost:5173
```

---

## Next Steps

Once both servers are running:

1. ✅ Test registration
2. ✅ Test login
3. ✅ Test protected routes
4. ✅ Test Socket.IO connection (check browser console)
5. ✅ Test file upload (resume)

---

**Ready to start? Open two terminal windows and run the commands above!**

