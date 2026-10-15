import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register.dto';
import { LoginAuthDto } from './dto/login.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly AuthService: AuthService) {}

  @ApiBody({ type: RegisterAuthDto })
  @Post('/register')
  async register(@Body() body: RegisterAuthDto) {
    return this.AuthService.register(body);
  }

  // THROTTLE_LIMIT solo existe en el CI de tests: en producción no se define
  @Throttle({ default: { limit: Number(process.env.THROTTLE_LIMIT) || 5, ttl: 60000 } })
  @ApiBody({ type: LoginAuthDto })
  @Post('/login')
  async login(@Body() loginAuthDto: LoginAuthDto) {
    return this.AuthService.login(loginAuthDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/refresh')
  @ApiOperation({ summary: 'Obtener un JWT fresco con datos actualizados' })
  async refreshToken(@Request() req: any) {
    return this.AuthService.refreshToken(req.user.id);
  }

  @Post('/verify-email')
  @ApiOperation({ summary: 'Verificar email con token de registro' })
  async verifyEmail(@Body() body: { token: string }) {
    return this.AuthService.verifyEmail(body.token);
  }

  @Throttle({ default: { limit: Number(process.env.THROTTLE_LIMIT) || 3, ttl: 60000 } })
  @Post('/resend-verification')
  @ApiOperation({ summary: 'Reenviar email de verificación' })
  async resendVerification(
    @Body() body: { email: string; platform?: 'web' | 'mobile' },
  ) {
    return this.AuthService.resendVerification(body.email, body.platform);
  }

  @Post('/forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña por email' })
  async forgotPassword(@Body() body: { email: string }) {
    return this.AuthService.forgotPassword(body.email);
  }

  @Post('/reset-password')
  @ApiOperation({ summary: 'Resetear contraseña con token' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.AuthService.resetPassword(body.token, body.newPassword);
  }
}
