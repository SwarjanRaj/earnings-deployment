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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const passport_1 = require("@nestjs/passport");
const auth_service_1 = require("./auth.service");
const signup_dto_1 = require("./dtos/signup.dto");
const signin_dto_1 = require("./dtos/signin.dto");
const verify_dto_1 = require("./dtos/verify.dto");
const forgot_dto_1 = require("./dtos/forgot.dto");
const reset_dto_1 = require("./dtos/reset.dto");
const ACCESS_TTL = 15 * 60 * 1000;
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV !== 'production';
const sameSite = isDev ? 'lax' : 'lax';
const secure = false;
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    signup(dto) {
        return this.auth.signup(dto);
    }
    async verify(dto, res) {
        const result = await this.auth.verifyCode(dto);
        this.setCookies(res, result.accessToken, result.refreshId, result.csrf);
        return result;
    }
    async login(dto, res) {
        const result = await this.auth.signin(dto);
        this.setCookies(res, result.accessToken, result.refreshId, result.csrf);
        return result;
    }
    async refresh(req, res) {
        const incoming = req.cookies?.refresh;
        if (!incoming)
            throw new common_1.UnauthorizedException('Missing refresh cookie');
        const result = await this.auth.refresh(incoming);
        this.setCookies(res, result.accessToken, result.refreshId, result.csrf);
        return result;
    }
    forgot(dto) {
        return this.auth.forgotPassword(dto);
    }
    async reset(dto, res) {
        const result = await this.auth.resetPassword(dto);
        this.setCookies(res, result.accessToken, result.refreshId, result.csrf);
        return result;
    }
    googleAuth(req) {
        const state = crypto.randomBytes(16).toString('hex');
        req._state = state;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/oauth/google/callback';
        const scope = 'profile email';
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scope)}&` +
            `state=${state}`;
        return { url: oauthUrl };
    }
    async googleCallback(req, state, res) {
        const user = req.user;
        const { accessToken, refreshId, refreshExpires, csrf } = await this.auth.generateTokens(user);
        this.setCookies(res, accessToken, refreshId, csrf);
        return { accessToken, refreshId, refreshExpires, csrf, user };
    }
    setCookies(res, access, refresh, csrf) {
        res
            .cookie('access', access, {
            httpOnly: true,
            maxAge: ACCESS_TTL,
            secure,
            sameSite,
        })
            .cookie('refresh', refresh, {
            httpOnly: true,
            maxAge: REFRESH_TTL,
            secure,
            sameSite,
        })
            .cookie('csrf_refresh', csrf, {
            httpOnly: false,
            maxAge: REFRESH_TTL,
            secure,
            sameSite,
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_dto_1.SignupDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_dto_1.VerifyCodeDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signin_dto_1.SigninDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('forgot'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "forgot", null);
__decorate([
    (0, common_1.Post)('reset'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_dto_1.ResetPasswordDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "reset", null);
__decorate([
    (0, common_1.Get)('oauth/google'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleAuth", null);
__decorate([
    (0, common_1.Get)('oauth/google/callback'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map