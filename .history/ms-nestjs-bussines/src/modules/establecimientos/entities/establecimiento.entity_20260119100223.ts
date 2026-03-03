import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserEstablecimientoEntity } from '../../users/entity/user-establecimiento.entity';
import { InvitacionEntity } from '../../invitaciones/invitacion.entity';

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

  // 👇 AGREGAR ESTA COLUMNA NUEVA 👇
  @Column({ type: 'json', nullable: true })
  configuracion: {
    umbral_mortalidad?: number;
    umbral_morbilidad?: number;
  };
  // 👆 FIN DE LO NUEVO 👆

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @OneToMany(
    () => UserEstablecimientoEntity,
    (userEst) => userEst.establecimiento,
  )
  usuariosAsignados: UserEstablecimientoEntity[];

  @OneToMany(() => InvitacionEntity, (invitacion) => invitacion.establecimiento)
  invitaciones: InvitacionEntity[];
}
