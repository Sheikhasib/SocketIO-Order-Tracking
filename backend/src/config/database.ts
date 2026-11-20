import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const connectDB = async () => {
  await prisma.$connect();
  console.log("✅ PostgreSQL (Neon) Connected");
};

export const closeDB = async () => {
  await prisma.$disconnect();
};
