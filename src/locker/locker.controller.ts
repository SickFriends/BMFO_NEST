import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorator/role.decorator';
import { GetUser } from 'src/auth/decorator/userinfo.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { User } from 'src/user/entity/user.entity';
import { RoleType } from 'src/user/role-type';
import { LockerService } from './locker.service';

@Controller('locker')
export class LockerController {
  constructor(private lockerService: LockerService) {}

  //판매자가 상품을 제공하기 위해 또는 특정한 이유로 라커문을 여는 경우에 사용하는 API이다.
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.SELLER)
  @Post('/openForProviding')
  public async openForProviding(@Query('lockerId') lockerId: number) {
    await this.lockerService.openForSeller(lockerId);
  }

  //기계에서 비밀번호를 받아와 문을 여는 경우에 사용하는 API이다.
  @Post('/openWithPass')
  public async openForCustommer(
    @Body('lockerId') lockerId: number,
    @Body('lockerPassword') lockerPassword: string,
  ) {
    return await this.lockerService.openForCustomer(lockerId, lockerPassword);
  }

  //사물함 정보들을 불러오는 API이다.
  @Get('')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.SELLER, RoleType.CUSTOMER)
  public async getLockers() {}
}
