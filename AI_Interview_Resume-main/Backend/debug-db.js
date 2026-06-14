const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const reports = await prisma.interviewReport.findMany({
      take: 5,
      select: {
        id: true,
        jobTitle: true,
      }
    });
    console.log("Reports in DB:", JSON.stringify(reports, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
