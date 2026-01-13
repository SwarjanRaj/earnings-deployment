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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
let MailService = MailService_1 = class MailService {
    cfg;
    log;
    from;
    enabled;
    constructor(cfg) {
        this.cfg = cfg;
        this.log = new common_1.Logger(MailService_1.name);
        const key = this.cfg.get('SENDGRID_API_KEY');
        this.enabled = Boolean(key);
        if (this.enabled) {
            sgMail.setApiKey(key);
        }
        else {
            this.log.warn('SENDGRID_API_KEY not set – MailService disabled');
        }
        this.from = this.cfg.get('EMAIL_FROM') ?? 'noreply@example.com';
    }
    async sendVerificationEmail(to, code) {
        if (!this.enabled)
            return;
        const msg = {
            to,
            from: this.from,
            subject: 'Verify your EarningsQuake account',
            html: `
        <p>Hi there 👋</p>
        <p>Your verification code is:</p>
        <h2 style="letter-spacing:4px">${code}</h2>
        <p>This code expires in 10&nbsp;minutes.</p>
      `,
        };
        try {
            await sgMail.send(msg);
        }
        catch (err) {
            this.log.error('Verification email failed', err);
        }
    }
    async sendPasswordResetEmail(to, code) {
        if (!this.enabled)
            return;
        const msg = {
            to,
            from: this.from,
            subject: 'Reset your EarningsQuake password',
            html: `
        <p>You requested a password reset.</p>
        <p>Your reset code:</p>
        <h2 style="letter-spacing:4px">${code}</h2>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      `,
        };
        try {
            await sgMail.send(msg);
        }
        catch (err) {
            this.log.error('Reset email failed', err);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=email.service.js.map