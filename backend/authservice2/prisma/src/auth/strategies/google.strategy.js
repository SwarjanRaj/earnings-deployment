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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_google_oauth20_1 = require("passport-google-oauth20");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("../auth.service");
let GoogleStrategy = class GoogleStrategy extends (0, passport_1.PassportStrategy)(passport_google_oauth20_1.Strategy, 'google') {
    auth;
    constructor(cfg, auth) {
        const clientID = cfg.get('GOOGLE_CLIENT_ID');
        const clientSecret = cfg.get('GOOGLE_CLIENT_SECRET');
        const callbackURL = cfg.get('GOOGLE_CALLBACK_URL');
        if (!clientID || !clientSecret || !callbackURL) {
            console.warn('Google OAuth credentials not configured. OAuth will be disabled.');
            super({
                clientID: 'dummy',
                clientSecret: 'dummy',
                callbackURL: 'http://localhost:3000/dummy',
            });
            return;
        }
        const options = {
            clientID,
            clientSecret,
            callbackURL,
            scope: ['profile', 'email'],
        };
        options.state = false;
        super(options);
        this.auth = auth;
    }
    async validate(accessToken, _refresh, profile) {
        const email = profile.emails?.[0]?.value;
        if (!email)
            throw new common_1.UnauthorizedException('Google account has no e-mail');
        return this.auth.googleOauthValidate(profile);
    }
};
exports.GoogleStrategy = GoogleStrategy;
exports.GoogleStrategy = GoogleStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        auth_service_1.AuthService])
], GoogleStrategy);
//# sourceMappingURL=google.strategy.js.map