import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('No company found, creating one...');
    const newCompany = await prisma.company.create({
      data: { name: 'Seed Company', location: 'Bangalore' }
    });
    return newCompany.id;
  }
  return company.id;
}

main().then(id => console.log(id)).finally(() => prisma.$disconnect());
