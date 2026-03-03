// src/modules/users/entity/establecimiento.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Usamos el mismo nombre EXACTO de la tabla en tu base de datos
@Entity('establecimientos')
export class Establecimiento {
  // 👇 AQUÍ ESTÁ EL CAMBIO:
  // Le decimos explícitamente que la columna en la BD es 'id_establecimiento'
  @PrimaryGeneratedColumn({ name: 'id_establecimiento' })
  id: number;

  @Column()
  nombre: string;
}
