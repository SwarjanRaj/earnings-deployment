"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const date_fns_1 = require("date-fns");
const crypto = require("crypto");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const users_service_1 = require("../users/users.service");
const email_service_1 = require("../email/email.service");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const random_token_1 = require("../common/utlis/random-token");
const env_1 = require("../common/env");
const CODE_TTL_SEC = 60 * 10;
const ACCESS_EXP_MIN = 15;
const REFRESH_EXP_DAYS = Number(process.env.REFRESH_EXPIRATION_DAYS ?? 7);
let AuthService = class AuthService {
    users;
    jwt;
    mail;
    prisma;
    redis;
    constructor(users, jwt, mail, prisma, redis) {
        this.users = users;
        this.jwt = jwt;
        this.mail = mail;
        this.prisma = prisma;
        this.redis = redis;
    }
    async createRefreshToken(userId) {
        const raw = crypto.randomUUID();
        const hash = await bcrypt.hash(raw, 10);
        const exp = (0, date_fns_1.addDays)(new Date(), REFRESH_EXP_DAYS);
        await this.prisma.refreshToken.create({
            data: { id: raw, tokenHash: hash, expiresAt: exp, userId },
        });
        return { raw, exp };
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.jwt.sign(payload, { expiresIn: `${ACCESS_EXP_MIN}m` });
        const { raw: refreshId, exp: refreshExpires } = await this.createRefreshToken(user.id);
        const csrf = (0, random_token_1.randomToken)();
        const result = {
            accessToken,
            refreshId,
            refreshExpires,
            csrf,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                isVerified: user.isVerified,
            },
        };
        console.log('DEBUG generateTokens result:', result);
        return result;
    }
    setCode(email, code) {
        return this.redis.setex(`verify:${email}`, CODE_TTL_SEC, code);
    }
    async popCode(email) {
        const key = `verify:${email}`;
        const code = await this.redis.get(key);
        if (code)
            await this.redis.del(key);
        return code;
    }
    async signup(dto) {
        if (await this.users.findByEmail(dto.email))
            throw new common_1.BadRequestException('Email already in use');
        const hash = await bcrypt.hash(dto.password, 12);
        const username = dto.email.split('@')[0];
        await this.users.create(dto.email, username, hash, client_1.UserRole.USER, undefined, undefined, undefined, false);
        const code = (Math.floor(100_000 + Math.random() * 900_000)).toString();
        await this.setCode(dto.email, code);
        if (!env_1.isDev) {
            await this.mail.sendVerificationEmail(dto.email, code);
        }
        else {
            console.log('DEBUG verify-code:', code);
        }
        return env_1.isDev
            ? { message: 'Signup successful — verify within 10 min', devCode: code }
            : { message: 'Signup successful — check your e-mail' };
    }
    async verifyCode(dto) {
        const stored = await this.popCode(dto.email);
        if (!stored || stored !== dto.code)
            throw new common_1.BadRequestException('Invalid or expired code');
        const user = await this.users.findByEmail(dto.email, true);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.users.markVerified(user.id);
        const { passwordHash, ...publicUser } = user;
        return this.generateTokens(publicUser);
    }
    async signin(dto) {
        const user = await this.users.findByEmail(dto.email, true);
        if (!user?.passwordHash)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!user.isVerified)
            throw new common_1.ForbiddenException('Please verify your email first');
        const { passwordHash, ...publicUser } = user;
        return this.generateTokens(publicUser);
    }
    async refresh(refreshId) {
        const row = await this.prisma.refreshToken.findUnique({
            where: { id: refreshId },
            include: { user: true },
        });
        if (!row)
            throw new common_1.UnauthorizedException('Invalid refresh token');
        if ((0, date_fns_1.isAfter)(new Date(), row.expiresAt))
            throw new common_1.UnauthorizedException('Refresh token expired');
        try {
            await this.prisma.refreshToken.delete({ where: { id: refreshId } });
        }
        catch (e) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        return this.generateTokens(row.user);
    }
    async forgotPassword(dto) {
        const user = await this.users.findByEmail(dto.email);
        if (user) {
            const code = (Math.floor(100_000 + Math.random() * 900_000)).toString();
            await this.setCode(dto.email, code);
            await this.mail.sendPasswordResetEmail(dto.email, code);
        }
        return { message: 'If registered, a reset code has been emailed' };
    }
    async resetPassword(dto) {
        const user = await this.users.findByEmail(dto.email, true);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const stored = await this.popCode(dto.email);
        if (!stored || stored !== dto.code)
            throw new common_1.BadRequestException('Invalid or expired reset code');
        const hash = await bcrypt.hash(dto.newPassword, 12);
        await this.users.updatePasswordByEmail(dto.email, hash);
        const { passwordHash, ...publicUser } = user;
        return this.generateTokens(publicUser);
    }
    async googleOauthValidate(profile) {
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName ?? undefined;
        const lastName = profile.name?.familyName ?? undefined;
        const allowed = process.env.GOOGLE_ALLOWED_DOMAIN;
        if (allowed && !email.endsWith(`@${allowed}`)) {
            throw new common_1.UnauthorizedException('Google account not in allowed domain');
        }
        let user = await this.users.findByEmail(email);
        if (!user) {
            const username = email.split('@')[0];
            user = await this.users.create(email, username, null, client_1.UserRole.USER, firstName, lastName, undefined, true);
        }
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        email_service_1.MailService,
        prisma_service_1.PrismaService,
        ioredis_2.Redis])
], AuthService);
//# sourceMappingURL=auth.service.js.map