import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
  
  const interviews = await prisma.mockInterview.findMany();
  const slots = await prisma.mockInterviewSlot.findMany();
  const sessions = await prisma.mockInterviewSession.findMany();

  console.log('--- Mock Interviews ---');
  console.log(JSON.stringify(interviews, null, 2));
  console.log('--- Slots ---');
  console.log(JSON.stringify(slots, null, 2));
  console.log('--- Sessions ---');
  console.log(JSON.stringify(sessions, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
