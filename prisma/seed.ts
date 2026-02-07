import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import bcryptjs from 'bcryptjs';

async function seed() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@subly.com' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    const hashedPassword = await bcryptjs.hash('admin123', 10); // Default password - change this!

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@subly.com',
        password: hashedPassword,
        role: 'ADMIN',
        verifiedAt: new Date(),
      },
    });

    console.log('Admin user seeded successfully:', adminUser.email);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
