import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserLoginDto } from '../user/dto/userLogin.dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/user/entity/user.entity';
import { RegisterUserDto } from '../user/dto/registerUser.dto';
import { TokenRepository } from './repository/token.repository';
import { UserService } from 'src/user/user.service';
import { Token } from './entity/token.entity';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private tokenRepository: TokenRepository,
  ) {}

  async registerUser(newUser: RegisterUserDto) {
    const user: User = await this.userService.createUser(newUser);
    return user.userId;
  }

  async login(req: Request, userLoginDto: UserLoginDto): Promise<any> {
    let userFind: User = await this.userService.findByFields({
      where: { username: userLoginDto.username },
    });
    console.log('dd1');
    if (!userFind) {
      console.log('dd2');
      throw new UnauthorizedException('아이디가 잘못되었습니다');
    }
    console.log('dd3');
    await this.userService.verifyPassword(
      userLoginDto.password,
      userFind.password,
    );
    console.log('dd4');
    console.log(userFind);
    const token = this.jwtService.sign(
      { ...userFind },
      {
        secret: process.env.SECRET_KEY,
        algorithm: 'HS256',
        expiresIn: '1h',
      },
    );
    console.log('2.');
    const refreshToken = this.jwtService.sign(
      {
        refreshToken: (await this.createToken(userFind.userId)).token,
      },
      {
        secret: process.env.SECRET_KEY,
        algorithm: 'HS256',
        expiresIn: '24h',
      },
    );
    console.log('3.');
    req.res.cookie('accessToken', token, {
      path: '/',
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
    });
    req.res.cookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      maxAge: 24 * 60 * 1000 * 60 * 1,
    });
    console.log('4.');
    return {
      refreshToken,
      token,
    };
  }

  public async logout(req: Request) {
    req.res.cookie('accessToken', '', {
      maxAge: 0,
    });
    req.res.cookie('refreshToken', '', {
      maxAge: 0,
    });
    console.log('okay');
    return 'okay';
  }

  private async createToken(userId: number): Promise<Token> {
    const refreshToken = new Token();
    refreshToken.token = randomBytes(64).toString('hex');
    refreshToken.userId = userId;
    refreshToken.valid = true;
    refreshToken.createdAt = new Date();
    await this.tokenRepository.save(refreshToken);
    return refreshToken;
  }
}
