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

  // varchar (no enum): el sistema solo maneja 'Seca' y 'En Tambo'.
  // (La preñez es un evento de tacto, NO un estado de madre.)
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
