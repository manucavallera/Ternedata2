import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Establecimiento } from '../../modules/establecimientos/entities/establecimiento.entity';
import { RolEstablecimiento } from '../invitaciones/roles.enum';

@Entity('invitaciones')
export class InvitacionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // 👇 AGREGA ESTA COLUMNA NUEVA
  @Column({ nullable: true }) // Es nullable por si generas links genéricos sin email
  email: string;

  @Column({ unique: true })
  token: string;

  @Column()
  establecimientoId: number;

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
