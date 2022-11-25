import { EntityRepository, Repository } from 'typeorm';
import { Product } from '../entity/product.entity';

@EntityRepository(Product)
export class ProductRepository extends Repository<Product> {}
