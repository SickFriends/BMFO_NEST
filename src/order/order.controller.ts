import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
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
  public async purchase(@GetUser() user: User) {
    // 매점 운영 시간 확인도 하기 x
    return await this.orderService.purchase(user);
  }
  //토스에서 결제가 성공했을 때 사용하는 API 이다.
  @Get('/purchaseSuccess')
  public async purchaseSuccessed(
    @Query('orderId') orderId: string,
    @Query('paymentKey') paymentKey: string,
    @Query('lockerPass') lockerPass: string,
    @Res() res: Response,
  ) {
    console.log(orderId, paymentKey);
    await this.orderService.successedOrder(orderId, paymentKey, lockerPass);
    res.redirect('http://localhost:3000');
  }
  //토스에서 결제가 실패했을 때 사용하는 API 이다.
  @Get('/purchaseFail')
  public async purchaseFailed(
    @Query('orderId') orderId: string,
    @Query('paymentKey') paymentKey: string,
    @Res() res: Response,
  ) {
    await this.orderService.failedOrder(orderId, paymentKey);
    res.redirect('http://localhost:3000');
  }

  //판매자가 결제 취소 할 때 사용하는 API 이다.
  @Post('/cancelPurchase')
  @Roles(RoleType.SELLER)
  public async cancelPurchase(
    @Query('ofderId') orderId: string,
    @Body('reason') reason: string,
  ) {
    //결제 취소를 한다.
    return await this.orderService.cancelOrder(orderId, reason);
  }

  @Get('/getOrderDetail')
  public async getOrderDetail(@Query('orderId') orderId: string) {
    return await this.orderService.getOrderDetail(orderId);
  }

  @Get('/getMyOrders')
  public async getMyOrders(@GetUser() user: User, @Query('page') page: number) {
    return await this.orderService.getOrderList(user.userId, page);
  }

  @Get('/getMyActivatedOrders')
  @Roles(RoleType.CUSTOMER)
  public async getMyActivatedOrders(@GetUser() user: User) {
    return await this.orderService.getActivatedUserOrders(user.userId);
  }
}
