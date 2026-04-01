import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('reset-password')
  async resetPassword(@Request() req, @Body() body: { newPassword: string }) {
    const hash = await this.authService.hashPassword(body.newPassword);
    await this.authService['prisma'].user.update({
      where: { id: req.user.id },
      data: { passwordHash: hash, legacyPasswordMd5: null },
    });
    return { message: 'Password updated successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { username: string }) {
    return this.authService.forgotPassword(body.username);
  }

  @Post('forgot-password-reset')
  async forgotPasswordReset(@Body() body: { token: string; newPassword: string }) {
    return this.authService.forgotPasswordReset(body.token, body.newPassword);
  }

  @Post('logout')
  async logout() {
    return { message: 'Logged out' };
  }
}
