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
import { Request } from 'express';
import { UserLoginDto } from '../user/dto/userLogin.dto';
import { AuthGuard } from './guards/auth.guard';
import { Roles } from './decorator/role.decorator';
import { RoleType } from '../user/role-type';
import { RegisterUserDto } from '../user/dto/registerUser.dto';

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
    return await this.authService.login(req, userDto);
  }

  // @Post('/logout')
  // @UseGuards(AuthGuard)
  // logout(@Req() req: Request, @Res() res: Response): any {
  //   // res.setHeader('Authorization', 'Bearer ');
  //   const user: any = req.user;
  //   res.cookie('accessToken', '', {
  //     maxAge: 0,
  //   });
  //   return res.send({
  //     success: true,
  //   });
  // }
  @Post('/getUser')
  @UseGuards(AuthGuard)
  isAuthenticated(@Req() req: Request): any {
    const user: any = req.user;
    return {
      user,
    };
  }
  // @Get('/admin-role')
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(RoleType.ADMIN, RoleType.USER)
  // adminRoleCheck(@Req() req: Request): any {
  //   const user: any = req.user;
  //   return user;
  // }
  // @Post('/sendResetPasswordMail')
  // async sendResetPasswordMail(@Body('username') username: string) {
  //   const jwt = await this.authService.resetPasswordToken(username);
  //   await this.mailService.sendForResetPassword(jwt.user, jwt.token);
  // }
  // @Get('/resetPassword')
  // @Render('resetedStatus.ejs')
  // async resetPassword(@Query('token') token: string, @Res() res: Response) {
  //   const resetPassword = randomBytes(4).toString('hex');
  //   const modifiedUser = await this.authService.resetPassword(
  //     token,
  //     resetPassword,
  //   );
  //   if (!modifiedUser) {
  //     return { username: '', status: false };
  //   }
  //   await this.mailService.sendForResetedPassword(modifiedUser, resetPassword);
  //   res.cookie('accessToken', '', {
  //     maxAge: 0,
  //   });
  //   res.cookie('refreshToken', '', {
  //     maxAge: 0,
  //   });
  //   return {
  //     username: modifiedUser.username,
  //     status: true,
  //   };
  // }
  // @Put('/modifyPassword')
  // @UseGuards(AuthGuard) //로그인이 되어있는 상태에서만 비밀번호를 변경 할 수 있다.
  // async modifyPassword(
  //   @GetUser() user: User,
  //   @Body('password') password: string,
  //   @Body('newPassword') newPassword: string,
  //   @Res() res: Response,
  // ) {
  //   const userDto: UserDto = {
  //     username: user.username,
  //     password: password,
  //   };
  //   const validatedUser = await this.authService.validateUser(userDto);
  //   await this.authService.modifyPassword(validatedUser.username, newPassword);
  //   res.cookie('accessToken', '', {
  //     maxAge: 0,
  //   });
  //   res.cookie('refreshToken', '', {
  //     maxAge: 0,
  //   });
  // }
  // @Delete('/secession')
  // @UseGuards(AuthGuard)
  // async deleteUser( @GetUser() user : User) {
  //     await this.userService.deleteUser(user.id);
  // }
}
