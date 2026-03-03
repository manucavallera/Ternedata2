// ms-nestjs-security/src/modules/users/entity/user-establecimiento.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'; // 👈 Agregamos ManyToOne y JoinColumn
import { UserEntity } from './users.entity'; // 👈 Importamos UserEntity

@Entity('user_establecimientos')
export class UserEstablecimientoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  establecimientoId: number;

  // 👇 1. IMPORTANTE: Agregamos el ROL aquí, para saber qué es en cada granja
  @Column({ nullable: true })
  rol: string;

  // 👇 2. IMPORTANTE: La conexión de vuelta al usuario
  @ManyToOne(() => UserEntity, (user) => user.userEstablecimientos)
  @JoinColumn({ name: 'userId' }) // Le decimos que use la columna 'userId' que ya existe
  user: UserEntity;
}
