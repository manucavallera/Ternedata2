import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum FormaPagoCompra {
  CONTADO = 'contado',
  CREDITO = 'credito',
}

@Entity('forrajeria_compras')
@Index(['id_establecimiento', 'fecha_creacion'])
export class CompraForrajeria {
  @PrimaryGeneratedColumn()
  id_compra: number;

  @Column()
  id_establecimiento: number;

  @Column()
  id_proveedor: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'varchar', length: 20, default: FormaPagoCompra.CONTADO })
  forma_pago: FormaPagoCompra;

  // Número de factura o remito del proveedor.
  @Column({ type: 'varchar', length: 60, nullable: true })
  comprobante: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn()
  fecha_creacion: Date;
}
