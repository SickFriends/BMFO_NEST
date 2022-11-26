import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entity/user.entity';
import { randomBytes } from 'crypto';
import { UserRepository } from './repository/user.repository';
import { RegisterUserDto } from './dto/registerUser.dto';
import { LockerService } from 'src/locker/locker.service';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private lockerService: LockerService,
  ) {}

  async findByFields(options: FindOneOptions): Promise<User | undefined> {
    return await this.userRepository.findOne(options);
  }

  public async createUser(
    registerDto: RegisterUserDto,
  ): Promise<User | undefined> {
    let userFind: User =
      (await this.findByFields({
        where: { username: registerDto.username },
      })) ||
      (await this.findByFields({
        where: { email: registerDto.email },
      }));
    if (userFind) {
      throw new HttpException(
        '아이디 또는 이메일이 이미 사용중입니다!',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.transformPassword(registerDto);
    const nUser = new User();
    nUser.email = registerDto.email;
    nUser.username = registerDto.username;
    nUser.password = registerDto.password;
    nUser.save();
    // 새로 가입한 고객의 라커 비밀번호는 1111로 설정해둔다.
    await this.lockerService.setLockerPass(nUser, '1111');
    return nUser;
  }

  private async transformPassword(user: RegisterUserDto): Promise<void> {
    user.password = await bcrypt.hash(user.password, 10);
    return Promise.resolve();
  }

  public async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatch = await bcrypt.compare(
      plainTextPassword,
      hashedPassword,
    );
    if (!isPasswordMatch) {
      throw new UnauthorizedException('비밀번호가 올바르지않습니다');
    }
    return;
  }

  public async getUserById(userId: number) {
    const user: User = await this.userRepository.findOne({
      userId,
    });
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 유저입니다');
    }
    return user;
  }
}

// async deleteUser(userId : number) {
//     const {myProfiles} = await this.userRepository.findOne(userId, {relations : ['myProfiles']});
//     myProfiles.forEach(async (myProfile) => {
//         this.trainService.deleteTrainProfile(userId, myProfile.trainId);
//     })
//     await this.userRepository.delete({
//         id:userId
//     });
// }
