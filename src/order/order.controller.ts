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
  public async purchaseSuccessed() {}
  //토스에서 결제가 실패했을 때 사용하는 API 이다.
  @Post('/purchaseFail')
  public async purchaseFailed() {
    // + 혹시 실행되지 않았을 스케줄러를 취소한다.
    // + 해당 주문서의 사물함을 returnLocker한다.
  }
  //판매자가 결제 취소 할 때 사용하는 API 이다.
  @Post('/rejectPurchase')
  @Roles(RoleType.SELLER)
  public async rejectPurchase() {
    //결제 취소를 한다.
  }
}
