import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorator/role.decorator';
import { GetUser } from 'src/auth/decorator/userinfo.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { User } from 'src/user/entity/user.entity';
import { RoleType } from 'src/user/role-type';
import { BasketService } from './basket.service';
import { PutProductRequestDto } from './dto/PutProductRequest.dto';

@Controller('basket')
@UseGuards(AuthGuard) //로그인이 되어있어야 사용가능하고
// @Roles(RoleType.CUSTOMER) // 커스터머만 사용할 수 있다.
export class BasketController {
  constructor(private basketService: BasketService) {}
  @Get('/getShoppingBasket')
  public async getMyShoppingBasket(@GetUser() user: User) {
    return await this.basketService.getShoppingBasket(user);
  }
  @Post('/putProduct')
  public async putProduct(
    @GetUser() user: User,
    @Body() req: PutProductRequestDto,
  ) {
    req.ownerId = user.userId;
    await this.basketService.putProduct(req);
    return '성공';
  }
}
