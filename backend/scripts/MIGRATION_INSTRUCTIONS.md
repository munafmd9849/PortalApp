# Migration Instructions: Neon → Supabase

## Step 1: Verify Supabase Connection String

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Find **Connection string** section
5. Copy the **Connection pooler** connection string (usually port 6543)
6. Or use **Direct connection** (usually port 5432)

**Important**: Supabase connection strings typically look like:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

## Step 2: Update .env File

Edit `backend/.env` and ensure:

```env
# New Supabase database (target)
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"

# Old Neon database (source)
OLD_DATABASE_URL="postgresql://[YOUR_NEON_CONNECTION_STRING]"
```

## Step 3: Test Supabase Connection

```bash
cd backend
node scripts/testSupabaseConnection.js
```

If connection fails:
- Verify password is correct
- Check if database is active in Supabase dashboard
- Try connection pooler port (6543) instead of direct (5432)
- Check if IP needs to be whitelisted in Supabase settings

## Step 4: Push Schema to Supabase

Once connection works:

```bash
cd backend
npx prisma db push
```

This creates all tables in your Supabase database.

## Step 5: Migrate Data

**Option A: If Neon quota is NOT exceeded** (can read from Neon):

```bash
cd backend
node scripts/migrateNeonToSupabase.js
```

**Option B: If Neon quota IS exceeded** (cannot read from Neon):

1. **Wait for quota to reset**, then run migration script, OR
2. **Export from Neon dashboard**:
   - Go to Neon dashboard
   - Export database as SQL dump
   - Import SQL dump into Supabase, OR
3. **Use pg_dump** (if you have access):
   ```bash
   pg_dump "OLD_NEON_URL" > dump.sql
   psql "NEW_SUPABASE_URL" < dump.sql
   ```

## Step 6: Verify Migration

After migration completes, check data:

```bash
cd backend
npx prisma studio
```

This opens a browser UI to browse your database tables.

## Troubleshooting

### Connection Issues

1. **Can't reach database server**:
   - Verify Supabase project is active
   - Check connection string format
   - Try pooler port (6543) vs direct (5432)

2. **Authentication failed**:
   - Double-check password
   - Reset database password in Supabase dashboard if needed

3. **SSL required**:
   - Ensure `?sslmode=require` is in connection string

### Migration Issues

1. **Quota exceeded on source**:
   - Wait for quota reset
   - Use database dump method instead

2. **Foreign key errors**:
   - Migration script handles dependencies automatically
   - Run migration script again (it uses upsert, so it's safe to rerun)

3. **Duplicate key errors**:
   - These are skipped automatically
   - Safe to ignore

## After Migration

1. Update your application to use Supabase
2. Test all features
3. Update environment variables in production
4. (Optional) Keep Neon database as backup for a few days
