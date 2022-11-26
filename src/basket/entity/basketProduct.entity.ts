import { Product } from 'src/product/entity/product.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Basket } from './basket.entity';

@Entity()
export class BasketProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  count: number;

  @Column()
  basketId: number;

  @ManyToOne((type) => Basket, (basket) => basket.basketProducts)
  @JoinColumn({ name: 'basketId' })
  basket: Basket;

  @Column()
  productId: number;

  @ManyToMany((type) => Product, (product) => product.basketProducts, {
    eager: true,
  })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
