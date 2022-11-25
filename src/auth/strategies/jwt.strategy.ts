import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { User } from 'src/user/entity/user.entity';
import { TokenRepository } from '../repository/token.repository';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private tokenRepository: TokenRepository,
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          request?.cookies?.accessToken || request?.cookies?.refreshToken,
      ]),
      ignoreExpiration: false, //만료기한을 무시할것인가
      secretOrKey: process.env.SECRET_KEY,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, user: User): Promise<any> {
    console.log('-', req.cookies.refreshToken, req.cookies.accessToken, '-');
    console.log(user);
    if (user.userId) {
      const userInfo: User = await this.userService.getUserById(user.userId);
      return userInfo;
    }

    const { refreshToken } = this.jwtService.verify(
      req?.cookies?.refreshToken,
      { secret: process.env.SECRET_KEY },
    );
    if (refreshToken === undefined) {
      throw new UnauthorizedException();
    }
    const tokenInfo = await this.getRecentToken(refreshToken);
    console.log(tokenInfo);
    if (tokenInfo === null) {
      throw new UnauthorizedException();
    }
    const passedTime = new Date().getTime() - tokenInfo.createdAt.getTime();
    if (passedTime > 24 * 60 * 1000 * 60 * 1) {
      throw new UnauthorizedException('refreshToken은 이미 만료되었습니다');
    }
    const userInfo: User = await this.userService.getUserById(tokenInfo.userId);
    if (userInfo === null) {
      throw new UnauthorizedException();
    }
    const token = this.jwtService.sign(
      { ...userInfo },
      {
        secret: process.env.SECRET_KEY,
        algorithm: 'HS256',
        expiresIn: '1h',
      },
    );
    req.res.cookie('token', token, {
      path: '/',
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
    });
    return userInfo;
  }

  private async getRecentToken(token: string) {
    return await this.tokenRepository.findOne({
      where: {
        token,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}

// npm install --save @nestjs/passport passport passport-local
// $ npm install --save-dev @types/passport-local
