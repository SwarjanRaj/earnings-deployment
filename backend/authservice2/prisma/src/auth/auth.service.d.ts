import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { UsersService } from '../users/users.service';
import { MailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { SignupDto } from './dtos/signup.dto';
import { SigninDto } from './dtos/signin.dto';
import { VerifyCodeDto } from './dtos/verify.dto';
import { ForgotPasswordDto } from './dtos/forgot.dto';
import { ResetPasswordDto } from './dtos/reset.dto';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    private readonly mail;
    private readonly prisma;
    private readonly redis;
    constructor(users: UsersService, jwt: JwtService, mail: MailService, prisma: PrismaService, redis: Redis);
    private createRefreshToken;
    generateTokens(user: {
        id: string;
        email: string;
        username: string;
        role: UserRole;
        isVerified: boolean;
    }): Promise<{
        accessToken: string;
        refreshId: `${string}-${string}-${string}-${string}-${string}`;
        refreshExpires: Date;
        csrf: string;
        user: {
            id: string;
            email: string;
            username: string;
            role: import(".prisma/client").$Enums.UserRole;
            isVerified: boolean;
        };
    }>;
    private setCode;
    private popCode;
    signup(dto: SignupDto): Promise<{
        message: string;
        devCode: string;
    } | {
        message: string;
        devCode?: undefined;
    }>;
    verifyCode(dto: VerifyCodeDto): Promise<{
        accessToken: string;
        refreshId: `${string}-${string}-${string}-${string}-${string}`;
        refreshExpires: Date;
        csrf: string;
        user: {
            id: string;
            email: string;
            username: string;
            role: import(".prisma/client").$Enums.UserRole;
            isVerified: boolean;
        };
    }>;
    signin(dto: SigninDto): Promise<{
        accessToken: string;
        refreshId: `${string}-${string}-${string}-${string}-${string}`;
        refreshExpires: Date;
        csrf: string;
        user: {
            id: string;
            email: string;
            username: string;
            role: import(".prisma/client").$Enums.UserRole;
            isVerified: boolean;
        };
    }>;
    refresh(refreshId: string): Promise<{
        accessToken: string;
        refreshId: `${string}-${string}-${string}-${string}-${string}`;
        refreshExpires: Date;
        csrf: string;
        user: {
            id: string;
            email: string;
            username: string;
            role: import(".prisma/client").$Enums.UserRole;
            isVerified: boolean;
        };
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        accessToken: string;
        refreshId: `${string}-${string}-${string}-${string}-${string}`;
        refreshExpires: Date;
        csrf: string;
        user: {
            id: string;
            email: string;
            username: string;
            role: import(".prisma/client").$Enums.UserRole;
            isVerified: boolean;
        };
    }>;
    googleOauthValidate(profile: import('passport-google-oauth20').Profile): Promise<{
        id: string;
        email: string;
        username: string;
        passwordHash: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isVerified: boolean;
    }>;
}
