import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const slots = await prisma.mockInterviewSlot.findMany({
    select: { status: true }
  });
  console.log('Slots Statuses:', slots.map(s => s.status));
  
  const drives = await prisma.mockInterviewDrive.findMany({
    include: { slots: true }
  });
  console.log('Drives count:', drives.length);
  drives.forEach(d => {
    console.log(`Drive: ${d.title}, Slots: ${d.slots.length}, Statuses: ${d.slots.map(s => s.status)}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
