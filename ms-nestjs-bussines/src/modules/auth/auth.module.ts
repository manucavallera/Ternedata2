import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from 'src/modules/users/entity/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';



@Module({
  imports:[
  ConfigModule,
  TypeOrmModule.forFeature([UserEntity]),
  JwtModule.registerAsync({
    imports:[ConfigModule],
    inject:[ConfigService],
    useFactory:async (configService: ConfigService) => ({
      secret: configService.get<string>('secret'),
      signOptions: { expiresIn: '5m' },
    }),
  }),  
  ],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy],
})
export class AuthModule {}
