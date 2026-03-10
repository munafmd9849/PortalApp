# Baseline Existing Database

Your Render PostgreSQL database already has tables, but Prisma doesn't have migration files. Here are two solutions:

## Solution 1: Use `prisma db push` (Recommended - Quick Fix)

This syncs your schema without creating migration files. Perfect for existing databases:

```bash
cd backend
npm run db:push
```

This will:
- ✅ Sync your Prisma schema with the existing database
- ✅ Add any missing tables/columns
- ✅ Skip creating migration files
- ✅ Allow you to seed immediately

**Then seed the database:**
```bash
npm run db:seed
```

## Solution 2: Create Baseline Migration (For Production)

If you want proper migration history:

### Step 1: Create Initial Migration
```bash
cd backend
npx prisma migrate dev --name init --create-only
```

This creates a migration file but doesn't apply it.

### Step 2: Mark Migration as Applied (Baseline)
```bash
npx prisma migrate resolve --applied init
```

This tells Prisma: "The database already matches this migration, mark it as done."

### Step 3: Verify
```bash
npx prisma migrate status
```

Should show: "Database schema is up to date"

### Step 4: Seed
```bash
npm run db:seed
```

## Which Solution to Use?

- **Use Solution 1 (`db push`)** if:
  - You just want to sync and seed quickly
  - You don't need migration history
  - This is a one-time setup

- **Use Solution 2 (Baseline)** if:
  - You want proper migration history
  - You're working in a team
  - You need to track schema changes over time

## After Setup

Once the schema is synced, you can:

1. **Seed the database:**
   ```bash
   npm run db:seed
   ```

2. **View your database:**
   ```bash
   npm run db:studio
   ```

3. **Verify connection:**
   ```bash
   npm run db:setup
   ```

## Adding the Announcements Table (or other new models)

If you get errors when running `npx prisma migrate dev --name add_announcements` (e.g. **shadow database** error P1003, or "could not create database"), use **`db push`** instead—it does not use migrations or a shadow database:

```bash
cd backend
npx prisma db push
```

Then regenerate the client:

```bash
npx prisma generate
```

**Why migrate dev can fail:**
- **Shadow database**: `migrate dev` creates a temporary DB to validate migrations; hosted Postgres (e.g. Render, Neon) often does not allow creating extra databases, so it fails.
- **No migrations folder**: If you have never run migrations, there is no baseline; `db push` syncs the schema directly.

**When to use which:**
- Use **`npx prisma db push`** to add the `announcements` table (and any other new schema) without dealing with migration history or shadow DB.
- Use **`npx prisma migrate deploy`** in production only if you already have migration files and a migration history.
