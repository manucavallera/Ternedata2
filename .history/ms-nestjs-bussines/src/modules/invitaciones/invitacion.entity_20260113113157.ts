import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Establecimiento } from '../../modules/establecimientos/entities/establecimiento.entity';
// 👇 CAMBIO CLAVE: Importamos desde el archivo "neutro" nuevo
import { RolEstablecimiento } from '../../common/enums/roles.enum';
// (Ajusta la ruta '../../common/enums/roles.enum' si guardaste el archivo en otro lado)

@Entity('invitaciones')
export class InvitacionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  token: string;

  @Column()
  establecimientoId: number;

  // Relación Inversa
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
