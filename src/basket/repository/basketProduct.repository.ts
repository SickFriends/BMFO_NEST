import { EntityRepository, Repository } from 'typeorm';
import { BasketProduct } from '../entity/basketProduct.entity';

@EntityRepository(BasketProduct)
export class BasketProductRepository extends Repository<BasketProduct> {}
