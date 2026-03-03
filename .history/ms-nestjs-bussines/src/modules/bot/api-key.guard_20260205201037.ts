import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BotApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    const validKey = process.env.BOT_API_KEY;

    console.log('🔑 Key recibida:', JSON.stringify(apiKey));
    console.log('🔑 Key esperada:', JSON.stringify(validKey));

    if (!validKey) {
      console.error('❌ BOT_API_KEY no configurada en .env');
      throw new UnauthorizedException('Bot API no configurada');
    }

    if (!apiKey || apiKey !== validKey) {
      console.warn('⚠️ Bot request con API key inválida');
      throw new UnauthorizedException('API Key inválida');
    }

    console.log('✅ Bot autenticado con API Key');
    return true;
  }
}
