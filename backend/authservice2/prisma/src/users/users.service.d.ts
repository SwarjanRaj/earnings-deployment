import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string, includePasswordHash?: boolean): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        username: string;
        passwordHash: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isVerified: boolean;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    findById(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        username: string;
        dob: Date | null;
        passwordHash: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isVerified: boolean;
        firstName: string | null;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    create(email: string, username: string, passwordHash: string | null, role?: UserRole, firstName?: string, lastName?: string, dob?: Date | string, isVerified?: boolean): Promise<User>;
    markVerified(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        username: string;
        dob: Date | null;
        passwordHash: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isVerified: boolean;
        firstName: string | null;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updatePasswordByEmail(email: string, newHash: string): Promise<{
        id: string;
        email: string;
        username: string;
        dob: Date | null;
        passwordHash: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isVerified: boolean;
        firstName: string | null;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
