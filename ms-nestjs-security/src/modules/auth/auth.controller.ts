import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register.dto';
import { LoginAuthDto } from './dto/login.dto';
import { ApiBody } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    
    constructor(private readonly AuthService:AuthService){}
    @ApiBody({ type: RegisterAuthDto })
    @Post('/register')
    async register(@Body() RegisterAuthDto:RegisterAuthDto) {
        return this.AuthService.register(RegisterAuthDto);
    }


    @ApiBody({ type: LoginAuthDto })
    @Post('/login')
    async login(@Body() loginAuthDto:LoginAuthDto) {
        return this.AuthService.login(loginAuthDto);
    }

}
