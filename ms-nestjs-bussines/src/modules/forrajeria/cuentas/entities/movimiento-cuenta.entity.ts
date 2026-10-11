import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoMovimientoCuenta {
  DEBE = 'debe',
  HABER = 'haber',
}

@Entity('forrajeria_movimientos_cuenta')
@Index(['id_establecimiento', 'id_contacto', 'fecha_creacion'])
export class MovimientoCuentaForrajeria {
  @PrimaryGeneratedColumn()
  id_movimiento: number;

  @Column()
  id_establecimiento: number;

  @Column()
  id_contacto: number;

  @Column({ type: 'varchar', length: 200 })
  concepto: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  debe: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  haber: number;

  @CreateDateColumn()
  fecha_creacion: Date;
}
