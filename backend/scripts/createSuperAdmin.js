/**
 * Create Super Admin User Script
 *
 * Creates the Super Admin user from env SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD.
 * Defaults: malhotra.harshikaa@gmail.com / esha123 (must match login credential check in auth).
 *
 * Run once after setting optional overrides in backend/.env:
 *   SUPER_ADMIN_EMAIL=...
 *   SUPER_ADMIN_PASSWORD=...
 *   SUPER_ADMIN_NAME=Super Admin   # optional
 *
 * Usage:
 *   node scripts/createSuperAdmin.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const EMAIL = process.env.SUPER_ADMIN_EMAIL || 'malhotra.harshikaa@gmail.com';
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'esha123';
const NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin';

async function createSuperAdmin() {
  console.log('👤 Creating Super Admin user...\n');
  console.log(`Email: ${EMAIL}`);
  console.log(`Name: ${NAME}\n`);

  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    console.warn('⚠️  SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in .env. Using defaults.');
    console.warn('   Set them in .env for production!\n');
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existing) {
      if (existing.role === 'SUPER_ADMIN') {
        console.log(`   User ${EMAIL} already exists as Super Admin.`);
        console.log('   Updating password to match current .env...');
        const passwordHash = await bcrypt.hash(PASSWORD, 10);
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, displayName: NAME, status: 'ACTIVE' },
        });
        console.log('✅ Super Admin password/name updated.\n');
        return;
      }
      console.log(`⚠️  User ${EMAIL} exists with role ${existing.role}.`);
      console.log('   Delete or change email in .env and retry.\n');
      return;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        displayName: NAME,
      },
    });

    console.log('✅ Super Admin created successfully!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.status}\n`);
    console.log('   Log in with this email and password to access the Super Admin dashboard.\n');
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error.message);
    throw error;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    console.error('   Set it in backend/.env\n');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');
    await createSuperAdmin();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
