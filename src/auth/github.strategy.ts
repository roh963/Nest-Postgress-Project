import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: { id: number; email: string; role: string }; // optional, no null
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = configService.get<string>('GITHUB_CLIENT_SECRET');
    const callbackURL =
      configService.get<string>('GITHUB_CALLBACK_URL') ||
      `${configService.get<string>('OAUTH_CALLBACK_BASE') || ''}/auth/github/callback`;

    if (!clientID || !clientSecret) {
      throw new InternalServerErrorException(
        'GitHub OAuth client id/secret not configured',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email'],
      passReqToCallback: true,
    });
  }

  // signature: (req, accessToken, refreshToken, profile, done)
  async validate(
    req: RequestWithUser,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    try {
      const email = profile?.emails?.[0]?.value?.toLowerCase();
      if (!email) {
        return done(
          new Error('No email returned from GitHub OAuth'),
          undefined,
        );
      }

      const user = await this.authService.handleOAuthLogin(
        {
          provider: 'github',
          providerUserId: profile.id,
          email,
          accessToken,
          refreshToken,
        },
        // pass undefined when no authenticated user
        req?.user,
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
