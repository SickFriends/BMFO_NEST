import { EntityRepository, Repository } from 'typeorm';
import { Basket } from '../entity/basket.entity';

@EntityRepository(Basket)
export class BasketRepository extends Repository<Basket> {}
