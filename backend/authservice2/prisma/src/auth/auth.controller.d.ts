import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { SigninDto } from './dtos/signin.dto';
import { VerifyCodeDto } from './dtos/verify.dto';
import { ForgotPasswordDto } from './dtos/forgot.dto';
import { ResetPasswordDto } from './dtos/reset.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    signup(dto: SignupDto): Promise<{
        message: string;
        devCode: string;
    } | {
        message: string;
        devCode?: undefined;
    }>;
    verify(dto: VerifyCodeDto, res: Response): Promise<{
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
    login(dto: SigninDto, res: Response): Promise<{
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
    refresh(req: Request, res: Response): Promise<{
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
    forgot(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    reset(dto: ResetPasswordDto, res: Response): Promise<{
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
    googleAuth(req: Request): {
        url: string;
    };
    googleCallback(req: Request, state: string, res: Response): Promise<{
        accessToken: string;
        refreshId: `${string}-${string}-${string}-${string}-${string}`;
        refreshExpires: Date;
        csrf: string;
        user: {
            id: string;
            email: string;
            username: string;
            passwordHash: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            isVerified: boolean;
        };
    }>;
    private setCookies;
}
