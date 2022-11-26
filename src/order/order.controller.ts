import { Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorator/role.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { RoleType } from 'src/user/role-type';

@Controller('order')
@UseGuards(AuthGuard, RolesGuard)
export class OrderController {
  //커스터머가 상품들을 주문할 때 사용하는 API 이다.
  @Post('/purchase')
  @Roles(RoleType.CUSTOMER)
  public async purchase() {}
  //토스에서 결제가 성공했을 때 사용하는 API 이다.
  @Post('/purchaseSuccessed')
  public async purchaseSuccessed() {
    //나중에 판매자에게 소켓으로 보내준다.
  }
  //토스에서 결제가 실패했을 때 사용하는 API 이다.
  @Post('/purchaseFailed')
  public async purchaseFailed() {}

  //판매자가 상품구매를 거부할 때 사용하는 API 이다.
  @Post('/rejectPurchase')
  @Roles(RoleType.SELLER)
  public async rejectPurchase() {}
}
