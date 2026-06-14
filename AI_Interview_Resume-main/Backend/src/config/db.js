const prisma = require("./prisma");

async function connectDB() {
  try {
    await prisma.$connect();
    console.log("Connected to SQLite (via Prisma)");
  } catch (error) {
    console.error("Error connecting to SQLite:", error);
    process.exit(1);
  }
}

module.exports = connectDB;
