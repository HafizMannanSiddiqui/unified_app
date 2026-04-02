import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';

class LoginDto {
  @ApiProperty({ example: 'abdul.mannan', description: 'Your username' })
  username: string;
  @ApiProperty({ example: 'your-password', description: 'Your password' })
  password: string;
}

class ResetPasswordDto {
  @ApiProperty({ example: 'newPass123', description: 'New password (min 6 chars)' })
  newPassword: string;
}

class ForgotPasswordDto {
  @ApiProperty({ example: 'abdul.mannan', description: 'Username of the account' })
  username: string;
}

class ForgotPasswordResetDto {
  @ApiProperty({ example: 'abc123token', description: 'Reset token from email' })
  token: string;
  @ApiProperty({ example: 'newPass123', description: 'New password' })
  newPassword: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with username & password, returns JWT token' })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: any) {
    return this.authService.login(body.username, body.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @Get('me')
  @ApiOperation({ summary: 'Get current logged-in user info' })
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @Post('reset-password')
  @ApiOperation({ summary: 'Change your own password (requires login)' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Request() req, @Body() body: ResetPasswordDto) {
    const hash = await this.authService.hashPassword(body.newPassword);
    await this.authService['prisma'].user.update({
      where: { id: req.user.id },
      data: { passwordHash: hash, legacyPasswordMd5: null },
    });
    return { message: 'Password updated successfully' };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset token (sent via email)' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.username);
  }

  @Post('forgot-password-reset')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({ type: ForgotPasswordResetDto })
  async forgotPasswordReset(@Body() body: ForgotPasswordResetDto) {
    return this.authService.forgotPasswordReset(body.token, body.newPassword);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (client-side token removal)' })
  async logout() {
    return { message: 'Logged out' };
  }
}
