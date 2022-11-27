import { Locker } from 'src/locker/entity/locker.entity';
import { EntityRepository, Repository } from 'typeorm';
import { Order } from '../entity/order.entity';

@EntityRepository(Order)
export class OrderRepository extends Repository<Order> {
  async getActivatedUserOrders(userId: number) {
    return await this.createQueryBuilder('Order')
      .select(`L.lockerId, L.password`)
      .addSelect('Order.orderId', 'orderId')
      .where(`userId=${userId}`)
      .innerJoin(
        (qb) => qb.from(Locker, 'Locker').select().where(`isUsing=1`),
        'L',
        'L.lockerId=Order.lockerId AND Order.orderId = L.orderId',
      )
      .getRawMany();
  }
}
