// ms-nestjs-business/src/modules/users/entity/users.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany, // ✅ 1. Importamos OneToMany
} from 'typeorm';
import {
  IsString,
  IsEmail,
  Length,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

// 👇 2. IMPORTAMOS LA NUEVA ENTIDAD INTERMEDIA
// (Asegúrate de que el archivo user-establecimiento.entity.ts esté en esta misma carpeta)
import { UserEstablecimientoEntity } from './user-establecimiento.entity';

export enum UserRole {
  ADMIN = 'admin',
  VETERINARIO = 'veterinario',
  OPERARIO = 'operario',
}

export enum UserStatus {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}

@Entity('users')
@Index('email_unique', ['email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  @Length(5, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío' })
  @Length(5, 100, {
    message: 'El correo electrónico debe tener entre 5 y 100 caracteres',
  })
  email: string;

  @Column({ type: 'varchar', length: 500 })
  @IsString()
  @MaxLength(500, {
    message: 'La contraseña no puede exceder los 500 caracteres',
  })
  password: string;

  // ===== NUEVOS CAMPOS PARA PANEL ADMIN =====

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.OPERARIO,
  })
  rol: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVO,
  })
  estado: UserStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  // ⚠️ NOTA: Este campo ya no define "propiedad", sino el "contexto actual".
  // Es decir, "qué campo está mirando el usuario ahora mismo".
  @Column({ type: 'int', nullable: true })
  id_establecimiento: number;

  @Column({ type: 'text', nullable: true })
  permisos_especiales: string; // JSON con permisos personalizados

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_acceso: Date;

  // ✅ 3. AGREGAMOS LA RELACIÓN (El "Enchufe")
  // Esto permite acceder a la lista de establecimientos donde el usuario tiene permisos
  @OneToMany(() => UserEstablecimientoEntity, (userEst) => userEst.user)
  establecimientosAsignados: UserEstablecimientoEntity[];
}
