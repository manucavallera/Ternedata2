import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './users.entity';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';
import { RolEstablecimiento } from '../../invitaciones/roles.enum';

@Entity('user_establecimientos')
export class UserEstablecimientoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // 🔗 Relación con Usuario
  @Column()
  userId: number;

  @ManyToOne(() => UserEntity, (user) => user.establecimientosAsignados)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  // 🔗 Relación con Establecimiento
  @Column()
  establecimientoId: number;

  @ManyToOne(() => Establecimiento, (est) => est.usuariosAsignados)
  @JoinColumn({ name: 'establecimientoId' })
  establecimiento: Establecimiento;

  // 🛡️ El Rol ESPECÍFICO para este campo
  @Column({
    type: 'enum',
    enum: RolEstablecimiento,
    default: RolEstablecimiento.OPERARIO,
  })
  rol: RolEstablecimiento;
}
