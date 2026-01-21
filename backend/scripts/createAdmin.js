/**
 * Create Admin User Script
 * 
 * Creates an admin user with specified email and password.
 * 
 * Usage:
 *   node scripts/createAdmin.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const EMAIL = 'charansai07136@gmail.com';
const PASSWORD = 'Sai#@143';
const ADMIN_NAME = 'Charansai Admin'; // You can customize this

async function createAdmin() {
  console.log('👤 Creating admin user...\n');
  console.log(`Email: ${EMAIL}`);
  console.log(`Name: ${ADMIN_NAME}\n`);

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existing) {
      console.log(`⚠️  User ${EMAIL} already exists.`);
      
      if (existing.role === 'ADMIN' || existing.role === 'SUPER_ADMIN') {
        console.log('   User is already an admin. Skipping...\n');
        return;
      } else {
        console.log(`   User exists but role is ${existing.role}.`);
        console.log('   You may need to update the role manually or delete and recreate.\n');
        return;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // Create user and admin in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with ADMIN role
      const user = await tx.user.create({
        data: {
          email: EMAIL,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          displayName: ADMIN_NAME,
        },
      });

      // Create admin profile
      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          name: ADMIN_NAME,
        },
      });

      return { user, admin };
    });

    console.log(`✅ Admin created successfully!`);
    console.log(`   User ID: ${result.user.id}`);
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Role: ${result.user.role}`);
    console.log(`   Status: ${result.user.status}`);
    console.log(`   Admin ID: ${result.admin.id}\n`);

    return result;
  } catch (error) {
    console.error(`❌ Error creating admin:`, error.message);
    throw error;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    console.error('Please set it in your .env file.\n');
    process.exit(1);
  }

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected\n');

    await createAdmin();

    // Verify the admin was created
    const admin = await prisma.user.findUnique({
      where: { email: EMAIL },
      include: {
        admin: true,
      },
    });

    if (admin) {
      console.log('📋 Admin Verification:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.status}`);
      console.log(`   Email Verified: ${admin.emailVerified}`);
      console.log(`   Admin Profile: ${admin.admin ? 'Created' : 'Not found'}\n`);
      console.log('✅ Admin account is ready to use!\n');
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
