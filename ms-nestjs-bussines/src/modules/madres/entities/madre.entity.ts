// ms-nestjs-business/src/modules/madres/entities/madre.entity.ts
import { EventoEntity } from 'src/modules/eventos/entities/evento.entity';
import { TerneroEntity } from 'src/modules/terneros/entities/ternero.entity';
import { Rodeos } from 'src/modules/rodeos/entities/rodeos.entity';
import {
  Column,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('madres')
@Index(['id_establecimiento'])
@Index(['rp_madre'])
export class MadreEntity {
  @PrimaryGeneratedColumn()
  id_madre: number;

  @Column({ nullable: false, type: 'varchar' })
  nombre: string;

  @Column({ nullable: true, type: 'integer' })
  rp_madre: number;

  // Categoría de la vaca (varchar, no enum): 'En Tambo', 'Seca', 'Preparto' o 'Vaquillona'.
  // La preñez va en estado_reproductivo, que sale de los eventos reproductivos.
  @Column({ type: 'varchar' })
  estado: string;

  @Column({ nullable: true, type: 'varchar' })
  observaciones: string;

  @Column({ type: 'date', nullable: true })
  fecha_nacimiento: Date;

  @Column({ type: 'int', nullable: true })
  id_establecimiento: number;

  @Column({ type: 'int', nullable: true })
  id_rodeo: number;

  @ManyToOne(() => Rodeos, { nullable: true, eager: false })
  @JoinColumn({ name: 'id_rodeo' })
  rodeo: Rodeos;

  // Rodeo lechero: los calcula TamboService a partir de eventos_reproductivos.
  @Column({ type: 'varchar', length: 20, nullable: true })
  estado_reproductivo: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_ultimo_parto: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_ultimo_servicio: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_ultimo_parche: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_ultimo_tacto: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_parto_probable: string | null;

  @Column({ type: 'int', default: 0 })
  numero_servicios: number;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;

  @OneToMany(() => TerneroEntity, (ternero) => ternero.madre, {
    onDelete: 'CASCADE',
  })
  terneros: TerneroEntity[];

  @ManyToMany(() => EventoEntity, (evento) => evento.madres)
  eventos: EventoEntity[];
}
