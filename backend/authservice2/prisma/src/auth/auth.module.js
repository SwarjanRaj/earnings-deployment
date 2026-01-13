"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const ioredis_1 = require("@nestjs-modules/ioredis");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const users_module_1 = require("../users/users.module");
const prisma_module_1 = require("../prisma/prisma.module");
const email_module_1 = require("../email/email.module");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const google_strategy_1 = require("./strategies/google.strategy");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    secret: cfg.get('JWT_SECRET'),
                    signOptions: { expiresIn: cfg.get('JWT_EXPIRATION') || '15m' },
                }),
            }),
            ioredis_1.RedisModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    type: 'single',
                    options: {
                        host: cfg.get('REDIS_HOST') || 'localhost',
                        port: Number(cfg.get('REDIS_PORT')) || 6379,
                        username: cfg.get('REDIS_USER') || undefined,
                        password: cfg.get('REDIS_PASS') || undefined,
                    },
                }),
            }),
            users_module_1.UsersModule,
            prisma_module_1.PrismaModule,
            email_module_1.MailModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            {
                provide: google_strategy_1.GoogleStrategy,
                useFactory: (configService, authService) => {
                    const clientID = configService.get('GOOGLE_CLIENT_ID');
                    const clientSecret = configService.get('GOOGLE_CLIENT_SECRET');
                    const callbackURL = configService.get('GOOGLE_CALLBACK_URL');
                    if (!clientID || !clientSecret || !callbackURL) {
                        console.warn('Google OAuth credentials not configured. OAuth will be disabled.');
                        return null;
                    }
                    return new google_strategy_1.GoogleStrategy(configService, authService);
                },
                inject: [config_1.ConfigService, auth_service_1.AuthService],
            },
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
        ].filter(Boolean),
        exports: [jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map