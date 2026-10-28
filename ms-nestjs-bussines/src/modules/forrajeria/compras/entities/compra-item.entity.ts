import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('forrajeria_compra_items')
export class CompraItemForrajeria {
  @PrimaryGeneratedColumn()
  id_item: number;

  @Column()
  id_compra: number;

  @Column()
  id_producto: number;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  cantidad: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  costo_unitario: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  subtotal: number;
}
