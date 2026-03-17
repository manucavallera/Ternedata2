import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register.dto';
import { LoginAuthDto } from './dto/login.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly AuthService: AuthService) {}

  @ApiBody({ type: RegisterAuthDto })
  @Post('/register')
  async register(@Body() body: RegisterAuthDto) {
    console.log('🔥 [CONTROLLER] Recibido:', JSON.stringify(body, null, 2));
    return this.AuthService.register(body);
  }

  @ApiBody({ type: LoginAuthDto })
  @Post('/login')
  async login(@Body() loginAuthDto: LoginAuthDto) {
    return this.AuthService.login(loginAuthDto);
  }

  @Get('generar-token')
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
