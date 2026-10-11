import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('forrajeria_pedido_items')
export class PedidoItemForrajeria {
  @PrimaryGeneratedColumn()
  id_item: number;

  @Column()
  id_pedido: number;

  @Column()
  id_producto: number;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  cantidad: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  precio_unitario: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  subtotal: number;
}
