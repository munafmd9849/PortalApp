/**
 * Seed Script: Initialize Admin Scoping
 * Sets existing admins to global wildcard access
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Admin Scoping Migration...');

  const admins = await prisma.admin.findMany();
  console.log(`Found ${admins.length} admins to update.`);

  for (const admin of admins) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        role: admin.role || 'ADMIN',
        permissions: admin.permissions || JSON.stringify(['*']),
        allowedSchools: admin.allowedSchools || JSON.stringify(['*']),
        allowedCenters: admin.allowedCenters || JSON.stringify(['*']),
        allowedBatches: admin.allowedBatches || JSON.stringify(['*']),
      }
    });
    console.log(`✅ Updated Admin: ${admin.name || admin.userId}`);
  }

  console.log('✨ Migration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
