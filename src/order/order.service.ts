import {
  HttpException,
  HttpService,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
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
    private httpService: HttpService,
  ) {
    this.headersRequest = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${process.env.TOSS_KEY}`,
    };
  }

  private headersRequest = {};
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
    // 스케줄러로 3분 뒤에도 아직 isApprove(결제 승인 상태)가 false 라면 returnLocker(lockerId) 한다.
    this.taskService.addNewTimeout(`lockerFor${orderId}`, 180000, async () => {
      //현재 오더가 3분뒤에 approve가 되었는지 확인한다.
      //approve가 되지 않았다면
      const order = await this.orderRepository.findOne({ orderId });
      if (!order.isApprove) {
        await this.lockerService.returnLocker(order.lockerId);
      }
    });
    return await this.orderRepository.save(newOrder);
  }

  public async successedOrder(orderId: string, paymentKey: string) {
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
    // + HTTP 요청으로 토스로 결제가 잘 되었는지 조회한다
    //GET /v1/aemnpsty/orders/{ orderId };
    let fetchedPaymentKey: string;
    try {
      const response = await this.httpService
        .get(`https://api.tosspayments.com/v1/payments/orders/${orderId}`, {
          headers: this.headersRequest,
        })
        .toPromise();
      fetchedPaymentKey = response.data.paymentKey;
    } catch (e) {
      // + 조회가 되지 않았다면
      throw new HttpException(
        '존재하지 않는 결제입니다',
        HttpStatus.BAD_REQUEST,
      );
    }
    // + paymentKey가 toss에서 조회한 paymentKey 와 같은지 검사한다.
    if (fetchedPaymentKey !== paymentKey) {
      //같지 않다면 에러를 발생시킨다.
      throw new HttpException(
        '정상적인 결제가 아닙니다',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 잘 조회가 된다면 해당 주문서에 결제 승인 상태 (isApprove)를 true로 바꾼다.
    await this.orderRepository.update(
      {
        orderId,
      },
      {
        isApprove: true,
      },
    );

    // 그런데 결제가 되었더라도 라커가 아직도 이 주문을 가지고있는지 확인한다.
    if (order.assignedLocker.orderId !== orderId) {
      //가지고 있지 않다면 결제를 취소한다 //이미 시간이 지나서 다른사람이 사용중이거나 비어있음.
      await this.rejectOrder(orderId);
      throw new HttpException(
        '결제 시간이 지났습니다 (결제를 취소합니다)',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    // ++ 판매자에게 구매목록을 소켓으로 보내준다.
  }

  public async rejectOrder(orderId: string) {
    const order: Order = await this.orderRepository.findOne({ orderId });
    if (!order) {
      throw new HttpException(
        '잘못된 접근입니다 (존재하지 않는 주문서)',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!order.isApprove) {
      throw new HttpException(
        '결제가 되지 않았거나, 결제가 이미 취소된 주문서입니다',
        HttpStatus.BAD_REQUEST,
      );
    }
    let fetchedPaymentKey: string;
    try {
      const response = await this.httpService
        .get(`https://api.tosspayments.com/v1/payments/orders/${orderId}`, {
          headers: this.headersRequest,
        })
        .toPromise();
      fetchedPaymentKey = response.data.paymentKey;
    } catch (e) {
      // + 조회가 되지 않았다면
      throw new HttpException(
        '존재하지 않는 결제 입니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //HTTP 요청으로 토스 결제를 취소한다
    await this.httpService
      .post(
        `https://api.tosspayments.com/v1/payments/${fetchedPaymentKey}/cancel`,
      )
      .toPromise();
    this.taskService.deleteTimeout(`lockerFor${orderId}`);
    //해당 주문서에 결제 승인 상태 (isApprove)를 false로 바꾼다.
    await this.orderRepository.update(
      {
        orderId,
      },
      {
        isApprove: false,
      },
    );
  }

  public async failedOrder() {}
}
