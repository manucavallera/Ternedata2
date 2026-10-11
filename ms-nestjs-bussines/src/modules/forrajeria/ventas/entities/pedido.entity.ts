import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum PedidoEstado {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  PREPARANDO = 'preparando',
  LISTO = 'listo',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
}

export enum FormaEntrega {
  RETIRO = 'retiro',
  REPARTO = 'reparto',
}

export enum FormaPago {
  CONTADO = 'contado',
  CREDITO = 'credito',
}

@Entity('forrajeria_pedidos')
@Index(['id_establecimiento', 'estado', 'fecha_creacion'])
export class PedidoForrajeria {
  @PrimaryGeneratedColumn()
  id_pedido: number;

  @Column()
  id_establecimiento: number;

  @Column()
  id_cliente: number;

  @Column({ type: 'varchar', length: 20, default: PedidoEstado.PENDIENTE })
  estado: PedidoEstado;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'varchar', length: 20, default: FormaEntrega.RETIRO })
  forma_entrega: FormaEntrega;

  @Column({ type: 'varchar', length: 20, default: FormaPago.CONTADO })
  forma_pago: FormaPago;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion_entrega: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zona_entrega: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
