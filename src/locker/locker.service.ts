import {
  HttpException,
  HttpService,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { User } from 'src/user/entity/user.entity';
import { Locker } from './entity/locker.entity';
import { LockerRepository } from './repository/locker.repository';

@Injectable()
export class LockerService {
  constructor(
    private lockerRepository: LockerRepository,
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
      await this.returnLocker(lockerId);
      return true;
    }
    //비밀번호가 맞지 않다면...
    return false;
  }

  public async getLockerPass(lockerId: number) {
    const lockerPass = await this.lockerRepository.findOne({
      select: ['password'],
      where: { lockerId },
    });
    if (!lockerPass) {
      return null;
    }
    return lockerPass.password;
  }

  private async checkLockerPass(lockerId: number, password: string) {
    const locker: Locker = await this.lockerRepository.findOne(lockerId, {
      select: ['password'],
      relations: ['assignedOrder'],
    });
    if (!locker.isUsing) {
      //이 때, 현재 맡겨놓은 물건이 없는 라커이다.
      throw new HttpException(
        '현재 활성화 되지 않은 라커입니다',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const lockerPassword = await this.getLockerPass(locker.lockerId);
    if (lockerPassword === password) {
      return true;
    }
    return false;
  }

  public async returnLocker(lockerId: number) {
    await this.lockerRepository.update(
      { isUsing: false, password: '', orderId: null },
      {
        lockerId,
      },
    );
  }

  public async assignLocker(
    orderId: string,
    password: string,
  ): Promise<Locker> {
    const lockers: Locker[] = await this.lockerRepository.find({
      isUsing: false,
    });

    if (lockers.length === 0) {
      throw new HttpException(
        '사물함을 배정할 수 없습니다',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.lockerRepository.update(
      {
        lockerId: lockers[0].lockerId,
      },
      {
        orderId,
        isUsing: true,
        password,
      },
    );

    // + 스케줄러로 5분 뒤에, order를 확인해서 isApprove가 false 라면 returnLocker(lockerId) 한다.

    return await this.lockerRepository.findOne({
      select: ['lockerId', 'isUsing'],
      where: {
        lockerId: lockers[0].lockerId,
      },
    });
  }

  //locker detail, locker history..
}
