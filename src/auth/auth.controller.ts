import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Render,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { UserLoginDto } from '../user/dto/userLogin.dto';
import { AuthGuard } from './guards/auth.guard';
import { Roles } from './decorator/role.decorator';
import { RoleType } from '../user/role-type';
import { RegisterUserDto } from '../user/dto/registerUser.dto';
import { GetUser } from './decorator/userinfo.decorator';
import { User } from 'src/user/entity/user.entity';

@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  @UsePipes(ValidationPipe)
  async registerAccount(
    @Req() req: Request,
    @Body() userDto: RegisterUserDto,
  ): Promise<any> {
    return await this.authService.registerUser(userDto);
  }

  @Post('/login')
  async login(
    @Body() userDto: UserLoginDto,
    @Req() req: Request,
  ): Promise<any> {
    console.log(userDto);
    return await this.authService.login(req, userDto);
  }

  @Get('/logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    console.log(req.user);
    await this.authService.logout(req);
    res.send('dd');
  }

  @Get('/getUser')
  @UseGuards(AuthGuard)
  isAuthenticated(@GetUser() user: User): User {
    return user;
  }
}
