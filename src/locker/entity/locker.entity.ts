import { Order } from 'src/order/entity/order.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class Locker extends BaseEntity {
  @PrimaryColumn()
  lockerId: number;

  @Column({
    default: false,
  })
  isUsing: boolean;

  @Column()
  orderId: string;

  @OneToOne((type) => Order, (order) => order.assignedLocker)
  @JoinColumn({ name: 'orderId' })
  assignedOrder: Order;
}
