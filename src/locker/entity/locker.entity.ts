import { Order } from 'src/order/entity/order.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
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
  isAvailable: boolean;

  @Column({
    default: false,
  })
  isUsing: boolean;

  @Column({
    default: false,
  })
  isWating: boolean;

  @Column({
    nullable: true,
  })
  orderId: string;

  @Column({
    select: false,
    default: '',
  })
  password: string;

  @OneToMany((type) => Order, (order) => order.assignedLocker)
  assignedOrders: Order[];
}
