import { Locker } from 'src/locker/entity/locker.entity';
import { User } from 'src/user/entity/user.entity';
import {
  BaseEntity,
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderedProduct } from './orderedProduct.entity';

@Entity()
export class Order extends BaseEntity {
  @PrimaryColumn()
  orderId: string;

  @OneToMany((type) => OrderedProduct, (orderedProduct) => orderedProduct.order)
  orderedProducts: OrderedProduct[];

  @Column() //총 가격
  amount: number;

  @Column({
    default: false,
  })
  isApprove: boolean;

  @Column()
  userId: number;

  @ManyToOne((type) => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  orderer: User;

  @Column({
    nullable: true,
  })
  lockerId: number;

  @ManyToOne((type) => Locker, (locker) => locker.assignedOrders, {
    nullable: true,
  })
  @JoinColumn({ name: 'lockerId' })
  assignedLocker: Locker;

  @Column()
  orderedAt: Date;
}
