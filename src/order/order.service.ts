import {
  HttpException,
  HttpService,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BasketService } from 'src/basket/basket.service';
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
    private httpService: HttpService,
  ) {
    this.headersRequest = {
      Authorization: `Basic dGVzdF9za19QMjR4TGVhNXpWQTBSQk5ScXA2M1FBTVlOd1c2Og==`,
    };
  }

  private headersRequest = {};

  //페이지네이션 추가하기
  public async getOrderList(userId: number, page: number = 1) {
    const [orders, count] = await this.orderRepository.findAndCount({
      where: {
        userId,
      },
      take: 5,
      skip: page - 1,
    });
    return {
      orders,
      maxPage: (count / 5).toFixed(0),
    };
  }

  //상품 목록까지도 모두 보내기
  public async getOrderDetail(orderId: string) {
    return await this.getOrderById(orderId, ['orderedProducts']);
  }

  //주문서를 만드는 메서드이다
  public async purchase(user: User) {
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
    newOrder.lockerId = null;
    userBasket.map((productInfo) => {
      totalPrice += productInfo.count * productInfo.product.price;
    });
    if (totalPrice <= 0) {
      throw new HttpException(
        '주문금액이 0원이 넘지 않습니다',
        HttpStatus.BAD_REQUEST,
      );
    }
    newOrder.amount = totalPrice;
    newOrder.isApprove = false;
    const order = await this.orderRepository.save(newOrder);
    await Promise.all(
      userBasket.map((productInfo) => {
        this.orderedProductRepository.save({
          orderId: order.orderId,
          productName: productInfo.product.name,
          productPrice: productInfo.product.price,
          count: productInfo.count,
        });
      }),
    );
    return order;
  }

  public async successedOrder(
    orderId: string,
    paymentKey: string,
    lockerPass: string,
  ) {
    const order = await this.getOrderById(orderId, ['assignedLocker']);
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
      console.log(e);
      throw new HttpException(
        '존재하지 않는 결제입니다',
        HttpStatus.BAD_REQUEST,
      );
    }
    // + paymentKey가 toss에서 조회한 paymentKey 와 같은지 검사한다.
    if (fetchedPaymentKey !== paymentKey) {
      //같지 않다면 에러를 발생시킨다.
      throw new HttpException(
        '정상적인 결제가 아닙니다 (toss에서 보낸 요청이 아닌것으로 판단)',
        HttpStatus.BAD_REQUEST,
      );
    }
    // 잘 조회가 된다면 일단, 해당 주문서에 결제 승인 상태 (isApprove)를 true로 바꾼다.
    await this.updateOrderStatus(orderId, true);
    //사물함을 배정받는다
    const assignedLocker: Locker = await this.lockerService.assignLocker(
      orderId,
      lockerPass,
    );
    if (!assignedLocker) {
      console.log('dd');
      await this.cancelOrder(orderId, '배정받을 수 있는 사물함이 없습니다.');
      throw new HttpException(
        '배정 받을 수 있는 사물함이 없음',
        HttpStatus.GONE,
      );
    }
    await this.orderRepository.update(
      {
        orderId,
      },
      {
        lockerId: assignedLocker.lockerId,
      },
    );
    // 결제가 다 되었다면 장바구니를 모두 비워준다.
    await this.basketService.deleteAll(order.userId);
    // ++ 판매자에게 구매목록을 소켓으로 보내준다.
  }

  //토스에서 실패요청을 했을때 내보내는 메서드이다//
  public async failedOrder(orderId: string, paymentKey: string) {
    const order = await this.getOrderById(orderId, ['assignedLocker']);
    if (order.isApprove) {
      throw new HttpException(
        '이미 결제가 완료가 되었는데요',
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
        '존재하지 않는 결제입니다',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 어차피 결제가 안되었기 때문이 업데이트 할 필요 없음
    // await this.updateOrderStatus(orderId, false);
  }

  public async cancelOrder(orderId: string, cancelReason: string) {
    const order = await this.getOrderById(orderId);
    if (!order.isApprove) {
      throw new HttpException(
        '결제가 되지 않았거나, 결제가 이미 취소된 주문서입니다',
        HttpStatus.BAD_REQUEST,
      );
    }
    let fetchedPaymentKey: string;
    try {
      //주문을 toss에서 조회한다.
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
    console.log('ddddd');
    //HTTP 요청으로 토스 결제를 취소한다
    try {
      await this.httpService
        .post(
          `https://api.tosspayments.com/v1/payments/${fetchedPaymentKey}/cancel`,
          {
            cancelReason,
          },
        )
        .toPromise();
    } catch (e) {
      console.log(e);
    }
    await this.updateOrderStatus(orderId, false);
  }

  public async updateOrderStatus(orderId: string, isApprove: boolean) {
    const order = await this.getOrderById(orderId);
    // 해당 주문서에 결제 승인 상태 (isApprove)를 true로 바꾼다.
    await this.orderRepository.update(
      {
        orderId: order.orderId,
      },
      {
        isApprove: isApprove,
      },
    );
  }

  public async getActivatedUserOrders(userId: number) {
    return await this.orderRepository.getActivatedUserOrders(userId);
  }

  private async getOrderById(orderId: string, relations: string[] = []) {
    const order = await this.orderRepository.findOne({
      where: {
        orderId,
      },
      relations,
    });
    if (!order) {
      throw new HttpException(
        '존재하지 않는 주문서입니다!',
        HttpStatus.NOT_FOUND,
      );
    }
    return order;
  }
}
// pkw42094
