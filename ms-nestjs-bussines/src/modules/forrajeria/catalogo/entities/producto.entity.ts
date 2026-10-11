import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UnidadVenta {
  KG = 'kg',
  BOLSA = 'bolsa',
  FARDO = 'fardo',
  ROLLO = 'rollo',
  TONELADA = 'tonelada',
  UNIDAD = 'unidad',
}

@Entity('forrajeria_productos')
@Index(['id_establecimiento', 'nombre'])
export class ProductoForrajeria {
  @PrimaryGeneratedColumn()
  id_producto: number;

  @Column()
  id_establecimiento: number;

  @Column({ nullable: true })
  id_categoria: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string;

  @Column({ type: 'varchar', length: 20 })
  unidad_venta: UnidadVenta;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  costo: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  precio: number;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0 })
  stock_actual: number;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0 })
  stock_minimo: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  lote: string;

  @Column({ type: 'date', nullable: true })
  vencimiento: Date;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
