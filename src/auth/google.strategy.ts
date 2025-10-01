import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: { id: number; email: string; role: string }; // optional, no null
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      `${configService.get<string>('OAUTH_CALLBACK_BASE') || ''}/auth/google/callback`;

    if (!clientID || !clientSecret) {
      throw new InternalServerErrorException(
        'Google OAuth client id/secret not configured',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  // signature: (req, accessToken, refreshToken, profile, done)
  async validate(
    req: RequestWithUser,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const email = profile?.emails?.[0]?.value?.toLowerCase();
      if (!email) {
        return done(
          new Error('No email returned from Google OAuth'),
          undefined,
        );
      }

      const user = await this.authService.handleOAuthLogin(
        {
          provider: 'google',
          providerUserId: profile.id,
          email,
          accessToken,
          refreshToken,
        },
        req?.user, // pass undefined if not present
      );

      done(null, {
        ...user,
        providerUserId: profile.id,
        email,
        accessToken,
        refreshToken,
        existingUser: req?.user,
      });
      return user;
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
