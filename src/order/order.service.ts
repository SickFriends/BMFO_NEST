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
    private taskService: TaskService,
    private httpService: HttpService,
  ) {
    console.log(process.env.TOSS_KEY);
    this.headersRequest = {
      Authorization: `Basic dGVzdF9za19QMjR4TGVhNXpWQTBSQk5ScXA2M1FBTVlOd1c2Og==`,
    };
  }

  private headersRequest = {};

  //페이지네이션 추가하기
  public async getOrderList(userId: number) {}

  //상품 목록까지도 모두 보내기
  public async getOrderDetail(orderId: string) {}

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
    userBasket.map((productInfo) => {
      totalPrice += productInfo.count * productInfo.product.price;
    });
    if (totalPrice === 0) {
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
    // 스케줄러로 3분 뒤에도 아직 isApprove(결제 승인 상태)가 false 라면 returnLocker(lockerId) 한다.
    this.taskService.addNewTimeout(`lockerFor${orderId}`, 180000, async () => {
      const order = await this.orderRepository.findOne(
        { orderId },
        {
          relations: ['assignedLocker'],
        },
      );
      //현재 오더가 3분뒤에도 승인이 안되었는데
      // 라커가 아직도 내 오더를 들고있는지 확인한다
      if (!order.isApprove) {
        if (order.assignedLocker.orderId === orderId) {
          //그렇다면 라커를 반환해서 내 오더를 버리게해준다.
          await this.lockerService.returnLocker(order.lockerId);
        }
      }
    });
    return order;
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
      console.log(e);
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
      await this.cancelOrder(
        orderId,
        '결제시간 지연으로 인한 사물함 할당 박탈',
      );
      throw new HttpException(
        '결제 시간이 지났습니다 (결제를 취소합니다)',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }
    await this.basketService.deleteAll(order.userId);

    // ++ 판매자에게 구매목록을 소켓으로 보내준다.
  }

  public async cancelOrder(orderId: string, cancelReason: string) {
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

    //HTTP 요청으로 토스 결제를 취소한다
    await this.httpService
      .post(
        `https://api.tosspayments.com/v1/payments/${fetchedPaymentKey}/cancel`,
        {
          cancelReason,
        },
      )
      .toPromise();
    await this.orderisNotApproved(orderId);
  }

  public async orderisNotApproved(orderId: string) {
    console.log(orderId);

    const order = await this.orderRepository.findOne({ orderId });
    if (!order) {
      throw new HttpException(
        '존재하지 않는 주문서인데..',
        HttpStatus.NOT_FOUND,
      );
    }
    if (order.isApprove) {
      throw new HttpException('', HttpStatus.BAD_REQUEST);
    }
    const locker = await this.lockerService.getLockerById(order.lockerId);
    //혹시나 해당 주문으로 활성화 된 라커가 있다면 라커를 바로 반환해준다.
    if (locker.orderId === orderId) {
      // 주문서에 있는 lockerId의 라커의 orderId가 현재 orderId로 똑같이 가지고 있는지를 확인한다.
      await this.lockerService.returnLocker(order.lockerId);
    }
    // 해당 주문서에 결제 승인 상태 (isApprove)를 false로 바꾼다.
    await this.orderRepository.update(
      {
        orderId,
      },
      {
        isApprove: false,
      },
    );
  }

  public async getActivatedUserOrders(userId: number) {
    return await this.orderRepository.getActivatedUserOrders(userId);
  }
}
// pkw42094
