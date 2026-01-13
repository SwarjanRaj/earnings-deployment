// src/auth/strategies/google.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    cfg: ConfigService,
    private readonly auth: AuthService,
  ) {
    const clientID = cfg.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = cfg.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = cfg.get<string>('GOOGLE_CALLBACK_URL');

    // Check if OAuth credentials are configured
    if (!clientID || !clientSecret || !callbackURL) {
      // Create a dummy strategy that will never be used
      super({
        clientID: 'dummy',
        clientSecret: 'dummy',
        callbackURL: 'http://localhost:3000/dummy',
      });
      return;
    }

    const options: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL,
      scope:        ['profile', 'email'],
      // Disable state parameter since we're not using sessions
    } as StrategyOptions & { state?: boolean };

    (options as any).state = false;         // disable CSRF/state param

    super(options);
  }

  /** Called by passport after Google redirects back with profile */
  async validate(accessToken: string, _refresh: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new UnauthorizedException('Google account has no e-mail');

    // upsert the user & return a JWT payload object – AuthService implements this
    return this.auth.googleOauthValidate(profile);
  }
}
