import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'sadmin@admin.com';
  const username = 'superadmin';
  const password = 'Superadmin123!';
  const passwordHash = await bcrypt.hash(password, 12);

  // Upsert super admin
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      // Always ensure role is SUPERADMIN and password is correct
      role: UserRole.SUPERADMIN,
      passwordHash,
      username,
      isVerified: true,
    },
    create: {
      email,
      passwordHash,
      username,
      role: UserRole.SUPERADMIN,
      isVerified: true,
    },
  });

  
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(() => prisma.$disconnect()); 