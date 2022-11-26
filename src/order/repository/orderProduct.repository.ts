import { EntityRepository, Repository } from 'typeorm';
import { OrderedProduct } from '../entity/orderedProduct.entity';

@EntityRepository(OrderedProduct)
export class OrderedProductRepository extends Repository<OrderedProduct> {}
