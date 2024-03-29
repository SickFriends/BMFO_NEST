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
import { orderStatus } from './entity/orderStatus.type';
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
    private taskService: TaskService,
  ) {
    this.headersRequest = {
      Authorization: `Basic dGVzdF9za19QMjR4TGVhNXpWQTBSQk5ScXA2M1FBTVlOd1c2Og==`,
    };
  }

  private headersRequest = {};

  //페이지네이션 추가하기
  public async getUserOrderList(userId: number, page: number = 1) {
    const orders = await this.orderRepository.find({
      where: {
        userId,
      },
      order: {
        orderedAt: 'DESC',
      },
      take: 11,
      skip: (page - 1) * 11,
    });
    const count = await this.orderRepository.count({
      where: {
        userId,
      },
    });
    return {
      orders,
      maxPage:
        count % 10 == 0
          ? parseInt((count / 5).toFixed(0))
          : parseInt((count / 5).toFixed(0)) + 1,
    };
  }

  public async getLockerOrderList(lockerId: number, page: number = 1) {
    const orders = await this.orderRepository.find({
      order: {
        orderedAt: 'DESC',
      },
      where: {
        lockerId,
      },
      relations: ['orderedProducts'],
      take: 5,
      skip: (page - 1) * 5,
    });
    const count = await this.orderRepository.count({
      where: {
        lockerId,
      },
    });
    return {
      orders,
      maxPage:
        count % 5 === 0
          ? parseInt((count / 5).toFixed(0))
          : parseInt((count / 5).toFixed(0)) + 1,
    };
  }

  //상품 목록까지도 모두 보내기
  public async getOrderDetail(orderId: string) {
    return await this.getOrderById(orderId, ['orderedProducts']);
  }

  //주문서를 만드는 메서드이다
  public async makeOrder(user: User) {
    const userBasket = await this.basketService.getShoppingBasket(user);
    console.log(user);
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
    const assignedLocker = await this.lockerService.assignLocker(orderId);
    newOrder.lockerId = assignedLocker.lockerId;
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
    newOrder.status = orderStatus.WATING;
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
    this.taskService.addNewTimeout(`${orderId}`, 90000, async () => {
      const order = await this.getOrderById(orderId);
      if (order.status === orderStatus.WATING) {
        await this.lockerService.returnLocker(order.lockerId);
        await this.updateOrderStatus(orderId, orderStatus.FAILED);
      }
    });
    return order;
  }

  public async successedOrder(
    orderId: string,
    paymentKey: string,
    lockerPass: string,
  ) {
    const order = await this.getOrderById(orderId, ['assignedLocker']);
    if (order.status !== orderStatus.WATING) {
      throw new HttpException(
        '이미 처리가 완료된 주문서입니다 (대기중인 주문이 아닙니다)',
        HttpStatus.AMBIGUOUS,
      );
    }
    //***// 주문을 toss에서 조회한다 //***//
    let fetchedOrder = await this.fetchOrder(orderId);
    //***// 주문을 toss에서 조회한다 //***//

    // + paymentKey가 toss에서 조회한 paymentKey 와 같은지 검사한다.
    if (fetchedOrder.paymentKey !== paymentKey) {
      //같지 않다면 에러를 발생시킨다.
      throw new HttpException(
        '정상적인 결제가 아닙니다 (toss에서 보낸 요청이 아닌것으로 판단)',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 주문할때 할당받은 라커가 아직도 내 주문을 가지고 있는지 확인한다.
    if (order.assignedLocker.orderId !== orderId) {
      await this.cancelOrder(
        orderId,
        '시간이 지나도 결제가 승인되지 않아 사물함 할당을 박탈당하셨습니다',
      );
      throw new HttpException(
        '시간이 지나도 결제가 승인되지 않아 사물함 할당을 박탈당하셨습니다',
        HttpStatus.REQUEST_TIMEOUT,
      );
    }

    //조회가 잘 되고나서 결제승인을 때려준다.
    await this.approveOrderToToss({
      userId: order.userId,
      amount: order.amount,
      paymentKey,
      orderId,
    });
    // 해당 주문서에 상태를 승인으로 변경.
    await this.updateOrderStatus(orderId, orderStatus.APPROVAL);

    //사물함을 사용한다고 선언한다.
    await this.lockerService.startUsingLocker(order.lockerId, lockerPass);
    // 결제가 다 되었다면 장바구니를 모두 비워준다.
    await this.basketService.deleteAll(order.userId);
    // ++ 판매자에게 구매목록을 소켓으로 보내준다.
  }

  //토스에서 실패요청을 했을때 내보내는 메서드이다//
  public async failedOrder(orderId: string) {
    const order = await this.getOrderById(orderId);
    await this.fetchOrder(orderId);
    if (order.status !== orderStatus.WATING) {
      throw new HttpException(
        '이미 처리가 완료가 된 주문서입니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
    //여기서 결제대기상태를 실패로 업데이트한다.
    await this.lockerService.returnLocker(order.lockerId);
    this.updateOrderStatus(orderId, orderStatus.FAILED);
  }

  public async cancelOrder(orderId: string, cancelReason: string) {
    const order = await this.getOrderById(orderId, ['assignedLocker']);
    if (order.status !== orderStatus.APPROVAL) {
      throw new HttpException(
        '결제가 이미 되지 않은 항목을 취소 할 수 없습니다!',
        HttpStatus.BAD_REQUEST,
      );
    }
    //***// 주문을 toss에서 조회한다 //***//
    let fetchedOrder = await this.fetchOrder(orderId);
    //***// 주문을 toss에서 조회한다 //***//
    //만약 결제를 취소하는데 아직도 라커에서 내 물건을 가지고 있다면
    if (
      order.assignedLocker.orderId === orderId &&
      order.assignedLocker.isUsing === true
    ) {
      await this.lockerService.returnLocker(order.assignedLocker.lockerId);
    }

    // orderStatus를 거부로 업데이트한다.
    await this.updateOrderStatus(orderId, orderStatus.CANCELED);
    //HTTP 요청으로 토스 한테도 결제를 취소 요청한다
    await this.requestCancelOrder(fetchedOrder.paymentKey, cancelReason);
  }

  public async updateOrderStatus(orderId: string, orderStatus: orderStatus) {
    const order = await this.getOrderById(orderId);
    // 해당 주문서에 결제 승인 상태 (isApprove)를 true로 바꾼다.
    await this.orderRepository.update(
      {
        orderId: order.orderId,
      },
      {
        status: orderStatus,
      },
    );
  }

  public async getActivatedUserOrders(userId: number) {
    return await this.orderRepository.getActivatedUserOrders(userId);
  }

  public async getActivatedAllOrders() {
    const allActivatedOrders =
      await this.orderRepository.getActivatedAllOrders();
    console.log(allActivatedOrders);
    return allActivatedOrders;
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

  private async fetchOrder(orderId: string) {
    //***// 주문을 toss에서 조회한다 //***//
    try {
      const response = await this.httpService
        .get(`https://api.tosspayments.com/v1/payments/orders/${orderId}`, {
          headers: this.headersRequest,
        })
        .toPromise();
      return response.data;
    } catch (e) {
      // + 조회가 되지 않았다면
      throw new HttpException(
        '존재하지 않는 결제입니다',
        HttpStatus.BAD_REQUEST,
      );
    }
    //***// 주문을 toss에서 조회한다 //***//
  }

  private async approveOrderToToss({ paymentKey, amount, userId, orderId }) {
    try {
      this.httpService.post(
        `https://api.tosspayments.com/v1/payments/confirm`,
        {
          paymentKey,
          amount,
          customerKey: `-${userId}`,
          orderId,
        },
        {
          headers: this.headersRequest,
        },
      );
    } catch (e) {
      throw new HttpException(
        '결제 승인에 문제가 발생했습니다',
        HttpStatus.NOT_MODIFIED,
      );
    }
  }

  private async requestCancelOrder(paymentKey: string, cancelReason: string) {
    try {
      this.httpService.post(
        `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
        {
          cancelReason,
        },
        {
          headers: this.headersRequest,
        },
      );
    } catch (e) {
      console.log(e);
    }
  }
}
// pkw42094
