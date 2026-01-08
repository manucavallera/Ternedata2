import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Establecimiento } from '../../modules/establecimientos/entities/establecimiento.entity';
import { RolEstablecimiento } from '../../modules/users/entity/user-establecimiento.entity';

@Entity('invitaciones')
export class InvitacionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  token: string;

  @Column()
  establecimientoId: number;

  // Relación Inversa (Apunta al cambio que hicimos en el Paso 1)
  @ManyToOne(() => Establecimiento, (est) => est.invitaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'establecimientoId' })
  establecimiento: Establecimiento;

  @Column({
    type: 'enum',
    enum: RolEstablecimiento,
    default: RolEstablecimiento.OPERARIO,
  })
  rol: RolEstablecimiento;

  @Column({ type: 'timestamp' })
  expiracion: Date;

  @Column({ default: false })
  usado: boolean;

  @CreateDateColumn()
  fecha_creacion: Date;
}
