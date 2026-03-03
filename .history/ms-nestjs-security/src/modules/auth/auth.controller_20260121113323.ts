import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register.dto';
import { LoginAuthDto } from './dto/login.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

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

  // 👇 AHORA RECIBE EMAIL Y ROL
  @Get('generar-token')
  dameToken(
    @Query('email') email: string,
    @Query('rol') rol: string, // 👈 Nuevo parámetro
  ) {
    const emailFinal = email || 'veterinario_test@gmail.com';
    const rolFinal = rol || 'operario'; // Default si no mandan nada
    return this.AuthService.crearTokenMagico(emailFinal, rolFinal);
  }
}
