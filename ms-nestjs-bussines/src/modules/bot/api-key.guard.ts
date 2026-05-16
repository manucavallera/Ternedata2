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

    if (!validKey) {
      throw new UnauthorizedException('Bot API no configurada');
    }

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('API Key inválida');
    }
    return true;
  }
}
