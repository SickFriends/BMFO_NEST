import { BasketProduct } from 'src/basket/entity/basketProduct.entity';
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn()
  productId: number;

  @Column()
  name: string;

  @Column()
  imgUrl: string;

  @Column()
  category: string;

  @Column()
  price: number;

  @OneToMany((type) => BasketProduct, (basketProduct) => basketProduct.product)
  basketProducts: BasketProduct[];
}
