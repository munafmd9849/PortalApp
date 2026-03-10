import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
    const users = await prisma.user.findMany({
        where: { role: 'ADMIN' }
    });
    console.log('Admins:', users);
}

checkAdmin()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
