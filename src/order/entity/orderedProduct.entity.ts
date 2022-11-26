import { Product } from 'src/product/entity/product.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity()
export class OrderedProduct extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productName: string;

  @Column()
  productPrice: number;

  @Column()
  count: number;

  @Column()
  orderId: string;

  @ManyToOne((type) => Order, (order) => order.orderedProducts)
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
