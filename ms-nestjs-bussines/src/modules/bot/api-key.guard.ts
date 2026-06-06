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
    // Acepta la key por header (n8n / clientes) o por query param ?key=
    // (Telegram/Evolution postean directo al webhook y no pueden mandar
    // headers custom; la key viaja en la URL configurada en setWebhook).
    const apiKey = request.headers['x-api-key'] || request.query?.key;

    const validKey = process.env.BOT_API_KEY;

    if (!validKey) {
      throw new UnauthorizedException('Bot API no configurada');
    }

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('API Key inválida');
    }
    return true;
  }
}
