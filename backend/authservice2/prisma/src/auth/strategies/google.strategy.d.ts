import { Strategy, Profile, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
declare const GoogleStrategy_base: new (...args: [options: import("passport-google-oauth20").StrategyOptionsWithRequest] | [options: StrategyOptions] | [options: StrategyOptions] | [options: import("passport-google-oauth20").StrategyOptionsWithRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class GoogleStrategy extends GoogleStrategy_base {
    private readonly auth;
    constructor(cfg: ConfigService, auth: AuthService);
    validate(accessToken: string, _refresh: string, profile: Profile): Promise<{
        id: string;
        email: string;
        username: string;
        passwordHash: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isVerified: boolean;
    }>;
}
export {};
