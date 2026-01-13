require('dotenv/config');
const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
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
            // Always ensure role is SUPER_ADMIN and password is correct
            role: Role.SUPER_ADMIN,
            password: passwordHash,
            username,
        },
        create: {
            id: uuidv4(),
            email,
            password: passwordHash,
            username,
            role: Role.SUPER_ADMIN,
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
