import { Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorator/role.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { RoleType } from 'src/user/role-type';

@Controller('locker')
export class LockerController {
  //판매자가 상품을 제공하기 위해 라커문을 여는 경우에 사용하는 API이다.
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleType.SELLER)
  @Post('/openForProviding')
  public async openForProviding() {}

  //기계에서 비밀번호를 받아와 문을 여는 경우에 사용하는 API이다.
  @Post('/openForCustommer')
  public async openForCustommer() {}
}
