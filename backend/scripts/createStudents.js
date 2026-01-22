/**
 * Create Students Script
 * 
 * Creates students with specified email addresses and password.
 * 
 * Usage:
 *   node scripts/createStudents.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const STUDENT_EMAILS = [
  'munafmd9849@gmail.com',
  'munafmd7407@gmail.com',
  'ssdqwert13@gmail.com',
  'temp87981@gmail.com',
  'temp20086@gmail.com',
  'temp83437@gmail.com',
];

const PASSWORD = 'qwert123';

async function createStudents() {
  console.log('👥 Creating students...\n');
  console.log(`Email addresses: ${STUDENT_EMAILS.length}`);
  console.log(`Password: ${PASSWORD}\n`);

  // Hash password once for all students
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const created = [];
  const errors = [];

  for (const email of STUDENT_EMAILS) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        console.log(`⚠️  User ${email} already exists, skipping...`);
        errors.push({ email, error: 'Already exists' });
        continue;
      }

      // Extract name from email (username part before @)
      const nameFromEmail = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
      const fullName = nameFromEmail
        .split(/[\s._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || email.split('@')[0];

      // Create user and student in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: 'STUDENT',
            status: 'ACTIVE',
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });

        // Create student profile with default values
        const student = await tx.student.create({
          data: {
            userId: user.id,
            fullName,
            email,
            phone: '0000000000', // Default phone, can be updated later
            batch: '25-29', // Default batch
            center: 'BANGALORE', // Default center
            school: 'SOT', // Default school
          },
        });

        return { user, student };
      });

      console.log(`✅ Created: ${email} (${fullName})`);
      created.push({ email, fullName, userId: result.user.id });
    } catch (error) {
      console.error(`❌ Error creating ${email}:`, error.message);
      errors.push({ email, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`✅ Successfully created: ${created.length} students`);
  console.log(`❌ Errors/Skipped: ${errors.length}`);
  console.log('='.repeat(60) + '\n');

  if (created.length > 0) {
    console.log('Created students:');
    created.forEach(({ email, fullName }) => {
      console.log(`  - ${fullName} (${email})`);
    });
    console.log('');
  }

  if (errors.length > 0) {
    console.log('Errors/Skipped:');
    errors.forEach(({ email, error }) => {
      console.log(`  - ${email}: ${error}`);
    });
    console.log('');
  }

  return { created, errors };
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

    await createStudents();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
