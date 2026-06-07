import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'admin@pwioi.in';
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { admin: true }
    });

    if (user) {
      console.log('✅ User found:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ User NOT found.');
    }
  } catch (err) {
    console.error('Error checking user:', err);
  }
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
