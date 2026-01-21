# Render PostgreSQL Database Setup Guide

This guide will help you set up and seed your Render PostgreSQL database.

## Prerequisites

1. **Render PostgreSQL Database** - Create one at https://render.com
2. **DATABASE_URL** - Get the connection string from Render dashboard
3. **Node.js 20+** installed locally

## Step 1: Get Your Render PostgreSQL Connection String

1. Go to https://dashboard.render.com
2. Select your PostgreSQL database
3. Copy the **Internal Database URL** (for Render services) or **External Database URL** (for local development)
4. Format: `postgresql://user:password@host:port/database`

## Step 2: Configure Environment Variables

Create or update `backend/.env`:

```bash
# Render PostgreSQL Connection String
DATABASE_URL="postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com:5432/database_name"

# Other required variables
JWT_SECRET="your-secret-key-here"
NODE_ENV="production"
PORT=3000
```

## Step 3: Run Database Migrations

This will create all tables in your Render PostgreSQL database:

```bash
cd backend

# Generate Prisma Client
npm run db:generate

# Run migrations (creates all tables)
npx prisma migrate deploy
```

**For development (creates migration files):**
```bash
npx prisma migrate dev --name init
```

## Step 4: Seed the Database (Optional)

Seed the database with sample data:

```bash
# Seed with production-grade data
npm run db:seed
```

This will create:
- 60 students
- 18 companies
- 55 jobs
- 300-500 applications
- Sample recruiters and admins

## Step 5: Verify Database Connection

```bash
# Open Prisma Studio to view database
npx prisma studio
```

This will open a browser interface at `http://localhost:5555` where you can view and edit your database.

## Step 6: Test Database Connection

```bash
# Test connection script
node scripts/testNewDatabaseConnection.js
```

## Troubleshooting

### Connection Issues

1. **"Can't reach database server"**
   - Check DATABASE_URL is correct
   - Verify Render database is running (not paused)
   - Check firewall/network settings

2. **"Connection pool exhausted"**
   - Render free tier has ~20 connection limit
   - Reduce connection pool size in `database.js`
   - Check for connection leaks

3. **"Database is sleeping"**
   - Render free tier databases sleep after 90s inactivity
   - First connection may take 30-60s to wake up
   - Consider upgrading to paid tier for production

### Migration Issues

1. **"Migration failed"**
   - Check DATABASE_URL is correct
   - Ensure database is accessible
   - Check Prisma schema is valid: `npx prisma validate`

2. **"Table already exists"**
   - Database may already have tables
   - Use `npx prisma migrate reset` to reset (WARNING: deletes all data)
   - Or use `npx prisma migrate deploy` for production

## Production Deployment

For Render backend service:

1. Set `DATABASE_URL` in Render environment variables
2. Use **Internal Database URL** (faster, no external access needed)
3. Run migrations in build command:
   ```bash
   npm run build && npx prisma migrate deploy
   ```

## Quick Commands Reference

```bash
# Generate Prisma Client
npm run db:generate

# Create and apply migrations
npx prisma migrate dev

# Apply migrations (production)
npx prisma migrate deploy

# Seed database
npm run db:seed

# Open database GUI
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Validate schema
npx prisma validate
```
