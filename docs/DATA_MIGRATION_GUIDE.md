# Data Migration Guide

## Current Status

✅ **Schema/Tables**: All 34 tables created in new database  
❌ **Data**: 0 records (empty tables)  
⚠️ **Issue**: Old database quota exceeded - cannot read data

## Why There's No Data?

The tables are **created** (structure is there), but they're **empty** because:
- Old database has exceeded its data transfer quota
- We cannot read/copy data from old → new database right now
- This is a temporary Neon database quota limit

## Solutions

### Option 1: Wait for Quota Reset (Easiest)

Neon quotas usually reset daily. When quota resets:

```bash
cd backend
node scripts/migrateNeonToSupabase.js
```

This will automatically copy ALL data from old → new database.

### Option 2: Manual Export from Neon Dashboard

1. Go to your **old Neon project** dashboard
2. Navigate to **SQL Editor** or **Export** section
3. Export your database as SQL dump
4. Import into new database using:
   ```bash
   psql "YOUR_NEW_DATABASE_URL" < export.sql
   ```

### Option 3: Use pg_dump (If PostgreSQL tools installed)

**Export from old database:**
```bash
pg_dump "postgresql://neondb_owner:npg_gdqwWocP0D4e@ep-divine-haze-a1qdzdmb-pooler.ap-southeast-1.aws.neon.tech/Portal?sslmode=require&channel_binding=require" > old_data.sql
```

**Import to new database:**
```bash
psql "postgresql://neondb_owner:npg_n9L2VgANpoWs@ep-summer-pine-a18bm539-pooler.ap-southeast-1.aws.neon.tech/Portal?sslmode=require&channel_binding=require" < old_data.sql
```

## Verify Migration

After migration completes, check data:

```bash
cd backend
node scripts/checkDataCounts.js
```

You should see data counts in the "New DB" column.

## What Gets Migrated?

The migration script copies:
- ✅ Users, Students, Companies, Recruiters, Admins
- ✅ Jobs, Applications, Job Tracking
- ✅ Skills, Education, Projects, Experiences
- ✅ Achievements, Certifications, Coding Profiles
- ✅ Interview Sessions, Rounds, Evaluations
- ✅ Notifications, Queries, Endorsements
- ✅ All other tables with complete relationships

## Troubleshooting

**Q: Migration script shows "quota exceeded"**  
A: Wait for quota to reset (usually 24 hours) or use manual export

**Q: Some tables have data, others don't**  
A: The script migrates in dependency order. If it stops partway, you can rerun it (it uses upsert, so it's safe)

**Q: Can I use the new database now?**  
A: Yes! But it's empty. You'll need to migrate data or start fresh.
