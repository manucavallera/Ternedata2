import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('registro_litros')
@Index(['id_establecimiento'])
export class RegistroLitrosEntity {
  @PrimaryGeneratedColumn()
  id_registro: number;

  @Column({ type: 'int' })
  id_establecimiento: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'numeric', default: 0 })
  litros_vendido: number;

  @Column({ type: 'numeric', default: 0 })
  litros_terneros: number;

  @Column({ type: 'varchar', nullable: true })
  observaciones: string;

  // Vacas efectivamente ordeñadas ese día. Arranca como el conteo de madres
  // 'En Tambo' al registrar, pero es editable (días de tratamiento se restan
  // algunas) sin tocar el rodeo. El promedio del día usa este número.
  @Column({ type: 'int', nullable: true })
  cantidad_vacas: number;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
