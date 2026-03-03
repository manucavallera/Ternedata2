// src/modules/users/entity/establecimiento.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Usamos el mismo nombre EXACTO de la tabla en tu base de datos
@Entity('establecimientos')
export class Establecimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;
}
