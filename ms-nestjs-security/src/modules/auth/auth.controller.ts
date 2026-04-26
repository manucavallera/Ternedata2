import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register.dto';
import { LoginAuthDto } from './dto/login.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBody({ type: LoginAuthDto })
  @Post('/login')
  async login(@Body() loginAuthDto: LoginAuthDto) {
    return this.AuthService.login(loginAuthDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('generar-token')
  @ApiOperation({ summary: 'Generar token de invitación (solo admin)' })
  dameToken(
    @Query('email') email: string,
    @Query('rol') rol: string,
    @Query('idEstablecimiento') idEstablecimiento: string,
  ) {
    const emailFinal = email || 'veterinario_test@gmail.com';
    const rolFinal = rol || 'operario';
    const idFinal = idEstablecimiento ? parseInt(idEstablecimiento) : null;

    return this.AuthService.crearTokenMagico(emailFinal, rolFinal, idFinal);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/refresh')
  @ApiOperation({ summary: 'Obtener un JWT fresco con datos actualizados' })
  async refreshToken(@Request() req: any) {
    return this.AuthService.refreshToken(req.user.id);
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
