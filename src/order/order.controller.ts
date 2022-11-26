import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorator/role.decorator';
import { GetUser } from 'src/auth/decorator/userinfo.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { Locker } from 'src/locker/entity/locker.entity';
import { LockerService } from 'src/locker/locker.service';
import { User } from 'src/user/entity/user.entity';
import { RoleType } from 'src/user/role-type';
import { OrderService } from './order.service';

@Controller('order')
@UseGuards(AuthGuard, RolesGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  //커스터머가 상품들을 주문할 때 사용하는 API 이다.
  @Post('/purchase')
  @Roles(RoleType.CUSTOMER)
  public async purchase(
    @GetUser() user: User,
    @Body('password') password: string,
  ) {
    //매점 운영 시간 확인도 하기
    return await this.orderService.purchase(user, password);
  }
  //토스에서 결제가 성공했을 때 사용하는 API 이다.
  @Post('/purchaseSuccess')
  public async purchaseSuccessed() {
    // + 주문서의 사물함이 그대로 내주문을 가지고 있고 (주문서의 사물함의 orderId가 주문서의 주문아이디와 같고), 주문서의 사물함의 사용중이 그대로라면 (isUsing이 true으로 되어있다면)
    // + 해당 주문서에 isApprove를 true로 바꾼다.  나중에 판매자에게 구매목록을 소켓으로 보내준다.
    // + 아니라면 결제 취소를 진행한다.
  }
  //토스에서 결제가 실패했을 때 사용하는 API 이다.
  @Post('/purchaseFail')
  public async purchaseFailed() {
    // + 해당 주문서에 isApprove를 false로 바꾼다.
    // + 해당 주문서의 사물함의 isUsing을 false로 바꾼다.
    // + 해당 주문서의 사물함의 orderId를 null로 비운다.
  }

  //판매자가 결제 취소 할 때 사용하는 API 이다.
  @Post('/rejectPurchase')
  @Roles(RoleType.SELLER)
  public async rejectPurchase() {
    //결제 취소를 한다.
  }
}
