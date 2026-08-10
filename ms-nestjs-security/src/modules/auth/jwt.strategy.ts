import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserEntity,
  UserStatus,
} from 'src/modules/users/entity/users.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const userId = Number(payload.sub || payload.id);
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['userEstablecimientos'],
    });

    if (!user || user.estado === UserStatus.INACTIVO) {
      throw new UnauthorizedException('Usuario inexistente o inactivo');
    }

    return {
      userId: user.id,
      id: user.id,
      username: user.name,
      rol: user.rol,
      id_establecimiento: user.id_establecimiento,
      userEstablecimientos: user.userEstablecimientos || [],
    };
  }
}
