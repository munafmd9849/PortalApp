import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure DATABASE_URL and SUPER_ADMIN_EMAIL come from backend/.env
dotenv.config({ path: join(__dirname, '../.env'), override: true });

const prisma = new PrismaClient();

async function upsertUser({ email, password, role, status = 'ACTIVE', displayName }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      status,
      emailVerified: true,
      displayName: displayName || null,
    },
    create: {
      email,
      passwordHash,
      role,
      status,
      emailVerified: true,
      displayName: displayName || null,
    },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Ensure backend/.env is present.');
  }
  if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
    throw new Error(`DATABASE_URL is not PostgreSQL: ${process.env.DATABASE_URL}`);
  }

  const required = (name) => {
    const v = (process.env[name] || '').trim();
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
  };

  const creds = {
    superAdmin: {
      email: (process.env.SUPER_ADMIN_EMAIL || 'admin@pwioi.in').trim(),
      password: required('SUPER_ADMIN_PASSWORD'),
    },
    admin: {
      email: required('ADMIN_EMAIL'),
      password: required('ADMIN_PASSWORD'),
    },
    student: {
      email: required('STUDENT_EMAIL'),
      password: required('STUDENT_PASSWORD'),
    },
  };

  // Remove previously seeded accounts if requested (comma-separated list of emails)
  const deleteEmails = (process.env.SEED_DELETE_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (deleteEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: deleteEmails } } });
  }

  // 1) SUPER_ADMIN user + Admin profile
  const superAdminUser = await upsertUser({
    email: creds.superAdmin.email,
    password: creds.superAdmin.password,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    displayName: 'Platform Super Admin',
  });

  await prisma.admin.upsert({
    where: { userId: superAdminUser.id },
    update: {
      name: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*']),
      allowedSchoolIds: JSON.stringify(['*']),
      allowedCenterIds: JSON.stringify(['*']),
      allowedBatchIds: JSON.stringify(['*']),
    },
    create: {
      userId: superAdminUser.id,
      name: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*']),
      allowedSchoolIds: JSON.stringify(['*']),
      allowedCenterIds: JSON.stringify(['*']),
      allowedBatchIds: JSON.stringify(['*']),
    },
  });

  // 2) ADMIN user + Admin profile
  const adminUser = await upsertUser({
    email: creds.admin.email,
    password: creds.admin.password,
    role: 'ADMIN',
    status: 'ACTIVE',
    displayName: 'Platform Admin',
  });

  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {
      name: 'Platform Admin',
      role: 'ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*']),
      allowedSchoolIds: JSON.stringify(['*']),
      allowedCenterIds: JSON.stringify(['*']),
      allowedBatchIds: JSON.stringify(['*']),
    },
    create: {
      userId: adminUser.id,
      name: 'Platform Admin',
      role: 'ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*']),
      allowedSchoolIds: JSON.stringify(['*']),
      allowedCenterIds: JSON.stringify(['*']),
      allowedBatchIds: JSON.stringify(['*']),
    },
  });

  // 3) STUDENT user + Student profile
  const studentUser = await upsertUser({
    email: creds.student.email,
    password: creds.student.password,
    role: 'STUDENT',
    status: 'ACTIVE',
    displayName: 'Test Student',
  });

  await prisma.student.upsert({
    where: { email: creds.student.email },
    update: {
      userId: studentUser.id,
      fullName: 'Charan Sai',
      email: creds.student.email,
      phone: '9999999999',
      enrollmentId: 'ENR-0001',
      school: 'SOT',
      center: 'BANGALORE',
      batch: '24-28',
      profileCompleted: true,
    },
    create: {
      userId: studentUser.id,
      fullName: 'Charan Sai',
      email: creds.student.email,
      phone: '9999999999',
      enrollmentId: 'ENR-0001',
      school: 'SOT',
      center: 'BANGALORE',
      batch: '24-28',
      profileCompleted: true,
    },
  });

  console.log('✅ Seeded auth users (no other data).');
  console.log('--- Credentials ---');
  console.log(`SUPER_ADMIN: ${creds.superAdmin.email}`);
  console.log(`ADMIN      : ${creds.admin.email}`);
  console.log(`STUDENT    : ${creds.student.email}`);
  console.log('-------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

