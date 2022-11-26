import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BasketService } from 'src/basket/basket.service';
import { Basket } from 'src/basket/entity/basket.entity';
import { Locker } from 'src/locker/entity/locker.entity';
import { LockerService } from 'src/locker/locker.service';
import { User } from 'src/user/entity/user.entity';
import { Order } from './entity/order.entity';
import { OrderRepository } from './repository/order.repository';
import { OrderedProductRepository } from './repository/orderProduct.repository';

@Injectable()
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private orderedProductRepository: OrderedProductRepository,
    private lockerService: LockerService,
    private basketService: BasketService,
  ) {}
  public async purchase(user: User) {
    //1. 매점시간 확인
    //2. 사물함 배정
    const assignedLocker: Locker = await this.lockerService.assignLocker();
    //3. 장바구니 순회 후
    const userBasket = await this.basketService.getShoppingBasket(user);
    if (!userBasket.length) {
      throw new HttpException(
        '장바구니에 물건이 아무것도 없습니다',
        HttpStatus.BAD_GATEWAY,
      );
    }
    let totalPrice = 0;
    const newOrder = new Order();
    newOrder.orderedAt = new Date();
    newOrder.userId = user.userId;
    newOrder.lockerId = assignedLocker.lockerId;
    await Promise.all(
      userBasket.map(async (productInfo) => {
        await this.orderedProductRepository.save({
          orderId: newOrder.orderId,
          productName: productInfo.product.name,
          productPrice: productInfo.product.price,
          count: productInfo.count,
        });
        totalPrice += productInfo.count * productInfo.product.price;
      }),
    );
    newOrder.amount = totalPrice;
    newOrder.isApprove = false;
    return newOrder.save();
  }
}
