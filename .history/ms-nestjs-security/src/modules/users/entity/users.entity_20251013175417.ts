import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsString,
  IsEmail,
  Length,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

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
    type: 'varchar',
    length: 20,
    default: 'operario',
  })
  rol: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'activo',
  })
  estado: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string;

  @Column({ type: 'text', nullable: true })
  permisos_especiales: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_acceso: Date;
}
