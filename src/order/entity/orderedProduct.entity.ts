import { Product } from 'src/product/entity/product.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity()
export class OrderedProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productName: number;

  @Column()
  productPrice: number;

  @Column()
  count: number;

  @Column()
  orderId: number;

  @ManyToOne((type) => Order, (order) => order.orderedProducts)
  order: Order;
}
