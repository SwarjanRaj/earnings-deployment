import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly cfg;
    private readonly log;
    private readonly from;
    private readonly enabled;
    constructor(cfg: ConfigService);
    sendVerificationEmail(to: string, code: string): Promise<void>;
    sendPasswordResetEmail(to: string, code: string): Promise<void>;
}
