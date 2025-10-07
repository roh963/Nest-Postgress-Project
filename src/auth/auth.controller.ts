import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { Deprecated } from 'src/common/decorators/deprecated.decorator';

interface User {
  id: number;
  email: string;
  role: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  logout(@Req() req, @Body('refreshToken') refreshToken: string) {
    const user = req.user as User;
    const userId = user.id;
    return this.authService.logout(userId, refreshToken);
  }

  @Get('google')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirect to Google consent' })
  googleAuth() {}

  @Get('google/callback')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens' })
  @ApiResponse({ status: 409, description: 'Provider account already linked' })
  async googleAuthRedirect(@Req() req) {
    const user = await this.authService.handleOAuthLogin(
      {
        provider: 'google',
        providerUserId: req.user.providerUserId,
        email: req.user.email,
        accessToken: req.user.accessToken,
        refreshToken: req.user.refreshToken,
      },
      req.user.existingUser,
    );
    return this.authService.createSession(user);
  }

  @Get('github')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Start GitHub OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirect to GitHub consent' })
  githubAuth() {}

  @Get('github/callback')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens' })
  @ApiResponse({ status: 409, description: 'Provider account already linked' })
  async githubAuthRedirect(@Req() req) {
    const user = await this.authService.handleOAuthLogin(
      {
        provider: 'github',
        providerUserId: req.user.providerUserId,
        email: req.user.email,
        accessToken: req.user.accessToken,
        refreshToken: req.user.refreshToken,
      },
      req.user.existingUser,
    );
    return this.authService.createSession(user);
  }

  @Deprecated()
  @Post('old-route')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Deprecated route (example)', deprecated: true })
  @ApiResponse({ status: 200, description: 'Example response (deprecated)' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async oldRoute(@Body() body: any, @Res() res) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', '2025-12-01');
    return res.status(200).json({
      message: 'This is a deprecated route. Use /v1/auth/register instead.',
      data: body,
    });
  }
}
