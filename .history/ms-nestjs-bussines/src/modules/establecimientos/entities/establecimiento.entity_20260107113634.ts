// ms-nestjs-business/src/modules/establecimientos/entities/establecimiento.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany, // 👈 1. IMPORTANTE: Agregar esto
} from 'typeorm';

// 👇 2. IMPORTAR LA ENTIDAD INTERMEDIA
// (Ajusta la ruta si es necesario, debería ser salir dos carpetas hacia atrás y entrar a users)
import { UserEstablecimientoEntity } from '../../users/entity/user-establecimiento.entity';

@Entity('establecimientos')
export class Establecimiento {
  @PrimaryGeneratedColumn()
  id_establecimiento: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  ubicacion: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  responsable: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  // ✅ 3. AGREGAR ESTA RELACIÓN
  // Esto permite al establecimiento saber quiénes son sus usuarios (Dueños, Vets, Operarios)
  @OneToMany(
    () => UserEstablecimientoEntity,
    (userEst) => userEst.establecimiento,
  )
  usuariosAsignados: UserEstablecimientoEntity[];
}
