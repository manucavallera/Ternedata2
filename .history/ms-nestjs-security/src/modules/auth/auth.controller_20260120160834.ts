import { Body, Controller, Get, Post, Query } from '@nestjs/common'; // 👈 AGREGAR Query
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

  // 👇 VERSIÓN DINÁMICA (Copia esto exacto)
  @Get('generar-token')
  dameToken(@Query('email') email: string) {
    const emailFinal = email || 'veterinario_test@gmail.com';
    return this.AuthService.crearTokenMagico(emailFinal);
  }
}
