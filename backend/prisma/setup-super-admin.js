import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pwioi.in';
  const newPassword = 'admin123';
  const passwordHash = await bcrypt.hash(newPassword, 10);

  console.log(`🚀 Promoting ${email} to SUPER_ADMIN...`);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error('❌ User not found! Please run the main seed first.');
    return;
  }

  await prisma.user.update({
    where: { email },
    data: {
      role: 'SUPER_ADMIN',
      passwordHash: passwordHash
    }
  });

  // Ensure Admin profile also reflects this
  await prisma.admin.upsert({
    where: { userId: user.id },
    update: { 
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*'])
    },
    create: {
      userId: user.id,
      name: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['*']),
      allowedSchools: JSON.stringify(['*']),
      allowedCenters: JSON.stringify(['*']),
      allowedBatches: JSON.stringify(['*'])
    }
  });

  console.log('✅ Promotion complete!');
  console.log('-------------------------');
  console.log(`Email: ${email}`);
  console.log(`Password: ${newPassword}`);
  console.log('-------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
