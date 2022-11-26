import { Locker } from 'src/locker/entity/locker.entity';
import { User } from 'src/user/entity/user.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderedProduct } from './orderedProduct.entity';

@Entity()
export class Order extends BaseEntity {
  @PrimaryGeneratedColumn()
  orderId: number;

  @OneToMany((type) => OrderedProduct, (orderedProduct) => orderedProduct.order)
  orderedProducts: OrderedProduct[];

  @Column() //총 가격
  amount: number;

  @Column()
  isApprove: boolean;

  @Column()
  userId: number;

  @ManyToOne((type) => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  orderer: User;

  @OneToOne((type) => Locker, (locker) => locker.assignedOrder)
  assignedLocker: Locker;
}
