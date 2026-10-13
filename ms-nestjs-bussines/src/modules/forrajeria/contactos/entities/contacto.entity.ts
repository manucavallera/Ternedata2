import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum TipoContacto {
  CLIENTE = 'cliente',
  PROVEEDOR = 'proveedor',
}

@Entity('forrajeria_contactos')
@Index(['id_establecimiento', 'tipo', 'nombre'])
export class ContactoForrajeria {
  @PrimaryGeneratedColumn()
  id_contacto: number;

  @Column()
  id_establecimiento: number;

  @Column({ type: 'varchar', length: 20 })
  tipo: TipoContacto;

  @Column({ type: 'boolean', default: false })
  es_productor: boolean;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  documento: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  whatsapp: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zona: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  limite_credito: number;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
