import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Esta entidad apunta a la MISMA tabla de la base de datos
@Entity('user_establecimientos')
export class UserEstablecimientoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  establecimientoId: number;
}
