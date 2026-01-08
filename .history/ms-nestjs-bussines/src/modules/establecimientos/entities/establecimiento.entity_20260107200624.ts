import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserEstablecimientoEntity } from '../../users/entity/user-establecimiento.entity';
// 👇 IMPORTANTE: Importamos la entidad de invitaciones
import { InvitacionEntity } from '../../invitaciones/entities/invitacion.entity';

@Entity('establecimientos')
export class Establecimiento {
  @PrimaryGeneratedColumn()
  id_establecimiento: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  ubicacion: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  responsable: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  // 👥 Relación con el Equipo (Usuarios que ya entraron)
  @OneToMany(
    () => UserEstablecimientoEntity,
    (userEst) => userEst.establecimiento,
  )
  usuariosAsignados: UserEstablecimientoEntity[];

  // 🎫 NUEVA RELACIÓN: Invitaciones pendientes
  // (Esto permite borrar las invitaciones si se borra el campo)
  @OneToMany(() => InvitacionEntity, (invitacion) => invitacion.establecimiento)
  invitaciones: InvitacionEntity[];
}
