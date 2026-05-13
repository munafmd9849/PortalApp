import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Academic Structure Migration...');

  // 1. Define hardcoded data from academics.js
  const centers = [
    { name: 'Bangalore', location: 'Bangalore' },
    { name: 'Noida', location: 'Noida' },
    { name: 'Lucknow', location: 'Lucknow' },
    { name: 'Pune', location: 'Pune' }
  ];

  const schools = [
    { name: 'School of Technology', code: 'SOT' },
    { name: 'School of Management', code: 'SOM' },
    { name: 'School of Healthcare', code: 'SOH' }
  ];

  const batches = [
    { year: '2023-2027', label: '23-27' },
    { year: '2024-2028', label: '24-28' },
    { year: '2025-2029', label: '25-29' },
    { year: '2026-2030', label: '26-30' }
  ];

  console.log('--- Step 1: Seeding Tables ---');
  
  const centerMap = {};
  for (const c of centers) {
    const record = await prisma.center.upsert({
      where: { name: c.name },
      update: {},
      create: { ...c, status: 'ACTIVE' }
    });
    centerMap[c.name.toUpperCase()] = record.id;
  }
  console.log('✅ Centers seeded');

  const schoolMap = {};
  for (const s of schools) {
    const record = await prisma.school.upsert({
      where: { name: s.name },
      update: {},
      create: { ...s, status: 'ACTIVE' }
    });
    schoolMap[s.code.toUpperCase()] = record.id; // Map by code (SOT, SOM, etc)
    schoolMap[s.name.toUpperCase()] = record.id; // Also map by full name
  }
  console.log('✅ Schools seeded');

  const batchMap = {};
  for (const b of batches) {
    const record = await prisma.batch.upsert({
      where: { year: b.year },
      update: {},
      create: { ...b, status: 'ACTIVE' }
    });
    batchMap[b.label.toUpperCase()] = record.id; // Map by label (23-27, etc)
    batchMap[b.year.toUpperCase()] = record.id; // Also map by year
  }
  console.log('✅ Batches seeded');

  console.log('--- Step 2: Migrating Existing Students ---');
  const students = await prisma.student.findMany({
    select: { id: true, school: true, center: true, batch: true }
  });

  let updatedCount = 0;
  for (const student of students) {
    const schoolId = schoolMap[student.school?.toUpperCase()] || null;
    const centerId = centerMap[student.center?.toUpperCase()] || null;
    const batchId = batchMap[student.batch?.toUpperCase()] || null;

    if (schoolId || centerId || batchId) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          schoolId,
          centerId,
          batchId
        }
      });
      updatedCount++;
    }
  }
  console.log(`✅ Migrated ${updatedCount} students to new ID structure`);

  console.log('--- Step 3: Migrating Existing Admins ---');
  const admins = await prisma.admin.findMany({
    select: { id: true, allowedSchools: true, allowedCenters: true, allowedBatches: true }
  });

  let adminCount = 0;
  for (const admin of admins) {
    try {
      const allowedS = JSON.parse(admin.allowedSchools || '[]');
      const allowedC = JSON.parse(admin.allowedCenters || '[]');
      const allowedB = JSON.parse(admin.allowedBatches || '[]');

      const allowedSchoolIds = allowedS.map(s => schoolMap[s.toUpperCase()]).filter(Boolean);
      const allowedCenterIds = allowedC.map(c => centerMap[c.toUpperCase()]).filter(Boolean);
      const allowedBatchIds = allowedB.map(b => batchMap[b.toUpperCase()]).filter(Boolean);

      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          allowedSchoolIds: JSON.stringify(allowedSchoolIds),
          allowedCenterIds: JSON.stringify(allowedCenterIds),
          allowedBatchIds: JSON.stringify(allowedBatchIds)
        }
      });
      adminCount++;
    } catch (err) {
      console.error(`Failed to migrate admin ${admin.id}:`, err.message);
    }
  }
  console.log(`✅ Migrated ${adminCount} admins to new scoping structure`);

  console.log('🎉 Migration Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
