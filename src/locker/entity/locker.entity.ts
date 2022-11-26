import { Order } from 'src/order/entity/order.entity';
import { BaseEntity, Column, Entity, OneToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class Locker extends BaseEntity {
  @PrimaryColumn()
  lockerId: number;
  @Column()
  isUsing: boolean;
  @Column()
  orderId: number;

  @OneToOne((type) => Order, (order) => order.assignedLocker)
  assignedOrder: Order;
}
