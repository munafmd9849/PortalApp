# Manual Migration Instructions

Since `prisma migrate dev` is interactive, please run this command manually in your terminal:

```bash
cd backend
npx prisma migrate dev --name add_google_calendar_token
```

This will:
1. Create a new migration file with the GoogleCalendarToken table
2. Apply the migration to your database
3. Regenerate the Prisma client

**OR** if you want to apply it directly without creating a migration file:

```bash
cd backend
npx prisma db push
```

This will push the schema changes directly to the database without creating a migration file.





