/**
 * Restore user accounts that were deleted by seed script
 * This will recreate the accounts with sample data
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Test@123'; // Change this to the actual password if known

const usersToRestore = [
  {
    email: 'charansai82140@gmail.com',
    fullName: 'Sai Charan',
    phone: '9390240737',
    enrollmentId: '2401010135',
    batch: '24-28',
    center: 'BANGALORE',
    school: 'SOT',
  },
  {
    email: 'charansai07136@gmail.com',
    fullName: 'Charan Sai',
    phone: '9876543210',
    enrollmentId: null,
    batch: '24-28',
    center: 'BANGALORE',
    school: 'SOT',
  },
];

async function restoreAccounts() {
  try {
    console.log('🔧 Restoring user accounts...\n');

    for (const userData of usersToRestore) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      console.log(`📝 Creating account for ${userData.email}...`);

      // Hash password
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          displayName: userData.fullName,
        },
      });

      console.log(`   ✅ User created: ${user.id}`);

      // Create student profile
      const student = await prisma.student.create({
        data: {
          userId: user.id,
          email: userData.email,
          fullName: userData.fullName,
          phone: userData.phone,
          enrollmentId: userData.enrollmentId,
          batch: userData.batch,
          center: userData.center,
          school: userData.school,
          statsApplied: 0,
          statsShortlisted: 0,
          statsInterviewed: 0,
          statsOffers: 0,
        },
      });

      console.log(`   ✅ Student profile created: ${student.id}`);
      console.log('');
    }

    console.log('✅ Account restoration completed!');
    console.log(`\n📋 Restored Accounts:`);
    console.log(`   Default password for both: ${DEFAULT_PASSWORD}`);
    console.log(`   ⚠️  Please change passwords after first login!`);

  } catch (error) {
    console.error('❌ Error restoring accounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreAccounts();
