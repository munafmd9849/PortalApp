import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { user: { email: 'charansai82140@gmail.com' } }
  });
  console.log("PublicProfileId:", student?.publicProfileId);
}
main().catch(console.error).finally(() => prisma.$disconnect());
