import { Product } from 'src/product/entity/product.entity';
import { User } from 'src/user/entity/user.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BasketProduct } from './basketProduct.entity';

@Entity()
export class Basket extends BaseEntity {
  @PrimaryGeneratedColumn()
  basketId: number;

  @OneToOne((type) => User, (user) => user.basket, {
    eager: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany((type) => BasketProduct, (basketProduct) => basketProduct.basket, {
    eager: true,
  })
  basketProducts: BasketProduct[];
}
