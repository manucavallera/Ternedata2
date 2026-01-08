import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './users.entity';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';

export enum RolEstablecimiento {
  DUENO = 'dueno', // Puede borrar el campo, gestionar usuarios, ver facturación
  VETERINARIO = 'veterinario', // Carga tactos, sanidad, ve reportes técnicos
  OPERARIO = 'operario', // Carga nacimientos, pesos, movimientos. No borra nada.
}

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
