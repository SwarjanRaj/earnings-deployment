require('dotenv/config');
const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();
async function main() {
    const email = 'sadmin@admin.com';
    const username = 'superadmin';
    const password = 'Superadmin123!';
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
        await prisma.user.delete({ where: { email } });
    }
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: UserRole.SUPERADMIN,
            passwordHash,
            username,
            isVerified: true,
        },
        create: {
            id: uuidv4(),
            email,
            passwordHash,
            username,
            role: UserRole.SUPERADMIN,
            isVerified: true,
        },
    });
    console.log('\nSuper admin seeded:');
    console.log('Email:    ' + email);
    console.log('Password: ' + password);
    console.log('Role:     ' + user.role);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map