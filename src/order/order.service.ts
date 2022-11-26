import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BasketService } from 'src/basket/basket.service';
import { Basket } from 'src/basket/entity/basket.entity';
import { Locker } from 'src/locker/entity/locker.entity';
import { LockerService } from 'src/locker/locker.service';
import { TaskService } from 'src/task/task.service';
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
    private taskService: TaskService,
  ) {}
  //주문서를 만드는 메서드이다
  public async purchase(user: User, lockerPass: string) {
    const userBasket = await this.basketService.getShoppingBasket(user);
    if (!userBasket.length) {
      throw new HttpException(
        '장바구니에 물건이 아무것도 없습니다',
        HttpStatus.BAD_GATEWAY,
      );
    }
    let totalPrice = 0;
    const orderId = randomUUID();
    const newOrder = new Order();
    newOrder.orderedAt = new Date();
    newOrder.userId = user.userId;
    newOrder.orderId = orderId;
    const assignedLocker: Locker = await this.lockerService.assignLocker(
      orderId,
      lockerPass,
    );
    newOrder.lockerId = assignedLocker.lockerId; //어디 라커에 배정받았었는지 확인하기위한 용도..
    await Promise.all(
      userBasket.map((productInfo) => {
        this.orderedProductRepository.save({
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

    this.taskService.addNewTimeout(`lockerFor${orderId}`, 180000, async () => {
      //현재 오더가 approve가 되었는지 확인한다.
      //approve가 되지 않았다면
      const order = await this.orderRepository.findOne({ orderId });
      if (!order.isApprove) {
        await this.lockerService.returnLocker(order.lockerId);
      }
    });
    return this.orderRepository.save(newOrder);
  }

  public async successedOrder(orderId: string) {
    const order: Order = await this.orderRepository.findOne(
      { orderId },
      { relations: ['assignedLocker'] },
    );
    if (!order) {
      throw new HttpException(
        '잘못된 접근입니다 (존재하지 않는 주문서)',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (order.assignedLocker.orderId !== orderId) {
      this.rejectOrder(orderId);
      throw new HttpException(
        '결제 시간이 지났습니다 (결제를 취소합니다)',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    // + HTTP 요청으로 토스로 결제가 잘 되었는지 조회한다

    // 잘 조회가 된다면 해당 주문서에 isApprove를 true로 바꾼다.
    await this.orderRepository.update(
      {
        orderId,
      },
      {
        isApprove: true,
      },
    );

    // ++ 판매자에게 구매목록을 소켓으로 보내준다.
  }

  public async failedOrder() {}

  public async rejectOrder(orderId: string) {
    //+ HTTP 요청으로 토스 결제를 취소한다
  }
}
