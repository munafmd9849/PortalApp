import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSuperAdmin() {
    try {
        const user = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' }
        });

        if (user) {
            console.log('✅ Super Admin found:');
            console.log('ID:', user.id);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Status:', user.status);
            console.log('Email Verified:', user.emailVerified);
        } else {
            console.log('❌ No Super Admin user found in the database.');
        }
    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSuperAdmin();
