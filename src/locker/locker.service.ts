import {
  HttpException,
  HttpService,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { User } from 'src/user/entity/user.entity';
import { Locker } from './entity/locker.entity';
import { LockerPass } from './entity/LockerPass.entity';
import { LockerRepository } from './repository/locker.repository';
import { LockerPassRepository } from './repository/lockerPass.repository';

@Injectable()
export class LockerService {
  constructor(
    private lockerRepository: LockerRepository,
    private lockerPassRepository: LockerPassRepository,
    private readonly httpService: HttpService,
  ) {}

  public async openForSeller(lockerId: number) {
    //라즈베리파이 플라스크서버에 오픈을 요청한다.
    this.httpService.post('http://10.150.149.50/open', {});
  }

  public async openForCustomer(lockerId: number, password: string) {
    const isSame = await this.checkLockerPass(lockerId, password);
    if (isSame) {
      //라즈베리 파이 플라스크 서버에 오픈을 요청한다.
      this.httpService.post('http://10.150.149.50/open', {});
      return true;
    }
    //비밀번호가 맞지 않다면...
    return;
  }

  public async setLockerPass(user: User, lockerPass: string): Promise<void> {
    const findedLockerPass: LockerPass =
      await this.lockerPassRepository.findOne({ userId: user.userId });
    if (findedLockerPass) {
      await this.lockerPassRepository.update(
        {
          lockerPassword: lockerPass,
        },
        {
          userId: user.userId,
        },
      );
      return;
    }
    await this.lockerPassRepository.save({
      lockerPassword: lockerPass,
    });
    return;
  }

  public async getLockerPass(userId: number) {
    const lockerPass = await this.lockerPassRepository.findOne({
      where: { userId: userId },
    });
    if (!lockerPass) {
      throw new HttpException(
        'locker Password를 찾을 수 없습니다',
        HttpStatus.NOT_FOUND,
      );
    }
    return lockerPass.lockerPassword;
  }

  private async checkLockerPass(lockerId: number, password: string) {
    const locker: Locker = await this.lockerRepository.findOne(lockerId, {
      relations: ['assignedOrder'],
    });
    if (!locker.assignedOrder) {
      //이 때, 현재 맡겨놓은 물건이 없는 라커이다.
      throw new HttpException(
        '현재 활성화 되지 않은 라커입니다',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const lockerPassword = await this.getLockerPass(
      locker.assignedOrder.userId,
    );
    if (lockerPassword === password) {
      return true;
    } else {
      false;
    }
  }
}
