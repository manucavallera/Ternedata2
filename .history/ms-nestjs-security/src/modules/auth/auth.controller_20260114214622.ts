import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register.dto';
import { LoginAuthDto } from './dto/login.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger'; // Asegúrate de importar ApiTags

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly AuthService: AuthService) {}

  @ApiBody({ type: RegisterAuthDto })
  @Post('/register')
  async register(@Body() body: RegisterAuthDto) {
    // 👈 Cambié el nombre de la variable a 'body' para evitar confusiones

    // 🕵️‍♂️ CHIVATO: Vamos a ver qué llega realmente desde el Frontend
    console.log(
      '🔥 [CONTROLLER] Recibido del Frontend:',
      JSON.stringify(body, null, 2),
    );

    return this.AuthService.register(body);
  }

  @ApiBody({ type: LoginAuthDto })
  @Post('/login')
  async login(@Body() loginAuthDto: LoginAuthDto) {
    return this.AuthService.login(loginAuthDto);
  }
}
