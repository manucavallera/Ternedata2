import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

// Business no emite tokens: los firma security (/auth/login) y acá solo se validan.
// El /auth/register y /auth/login propios de business se sacaron: nadie los usaba,
// salteaban la verificación de email y escribían el token en los logs.
@Module({
  imports: [ConfigModule],
  providers: [JwtStrategy],
})
export class AuthModule {}
