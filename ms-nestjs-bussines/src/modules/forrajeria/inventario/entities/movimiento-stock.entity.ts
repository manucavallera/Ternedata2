import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoMovimientoStock {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  AJUSTE = 'ajuste',
}

@Entity('forrajeria_movimientos_stock')
@Index(['id_establecimiento', 'id_producto', 'fecha_creacion'])
export class MovimientoStock {
  @PrimaryGeneratedColumn()
  id_movimiento: number;

  @Column()
  id_establecimiento: number;

  @Column()
  id_producto: number;

  @Column({ type: 'varchar', length: 20 })
  tipo: TipoMovimientoStock;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  cantidad: number;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  stock_anterior: number;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  stock_nuevo: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  motivo: string;

  @CreateDateColumn()
  fecha_creacion: Date;
}
