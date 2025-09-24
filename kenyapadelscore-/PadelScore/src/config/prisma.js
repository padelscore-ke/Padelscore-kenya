const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test the connection
prisma.$connect()
  .then(() => {
    console.log('Connected to PostgreSQL database via Prisma');
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(-1);
  });

module.exports = prisma;