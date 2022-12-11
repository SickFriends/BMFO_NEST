import {
  HttpException,
  HttpService,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { TaskService } from 'src/task/task.service';
import { User } from 'src/user/entity/user.entity';
import { Locker } from './entity/locker.entity';
import { LockerRepository } from './repository/locker.repository';

@Injectable()
export class LockerService {
  constructor(
    private lockerRepository: LockerRepository,
    private taskService: TaskService,
    private readonly httpService: HttpService,
  ) {}

  public async openForSeller(lockerId: number) {
    //라즈베리파이 플라스크서버에 오픈을 요청한다.
    await this.httpService
      .post('http://192.168.109.68:5000/openForSeller', {
        lockerId: lockerId,
      })
      .toPromise();
  }

  public async openForCustomer(lockerId: number, password: string) {
    const locker = await this.getLockerById(lockerId);
    const isSame = await this.checkLockerPass(lockerId, password);
    if (isSame) {
      //라즈베리 파이 플라스크 서버에 오픈을 요청한다.
      await this.returnLocker(lockerId);
      await this.httpService
        .post('http://192.168.109.68:5000/openForSeller', {
          lockerId: lockerId,
        })
        .toPromise();
      return {
        SUCCESS: true,
        orderId: locker.orderId,
      };
    }
    //비밀번호가 맞지 않다면...
    return {
      SUCCESS: false,
    };
  }

  private async checkLockerPass(lockerId: number, password: string) {
    console.log('1');
    const locker: Locker = await this.lockerRepository.findOne({
      where: {
        lockerId,
      },
      select: ['password', 'lockerId', 'isUsing'],
    });
    console.log('2');
    if (!locker.isUsing) {
      //이 때, 현재 맡겨놓은 물건이 없는 라커이다.
      throw new HttpException(
        '현재 활성화 되지 않은 라커입니다',
        HttpStatus.BAD_GATEWAY,
      );
    }
    console.log('3');
    if (locker.password === password) {
      return true;
    }
    return false;
  }

  public async returnLocker(lockerId: number) {
    await this.lockerRepository.update(
      {
        lockerId,
      },
      { isUsing: false, isWating: false, password: '', orderId: null },
    );
  }

  public async startUsingLocker(lockerId: number, lockerPass: string) {
    await this.lockerRepository.update(
      {
        lockerId,
      },
      { isUsing: true, password: lockerPass, isWating: false },
    );
  }

  public async startWatingLocker(lockerId: number, orderId: string) {
    await this.lockerRepository.update(
      {
        lockerId,
      },
      {
        isWating: true,
        orderId: orderId,
      },
    );
  }

  public async assignLocker(orderId: string): Promise<Locker> {
    const lockers: Locker[] = await this.lockerRepository.find({
      isUsing: false,
      isWating: false,
      isAvailable: true,
    });
    if (lockers.length === 0) {
      throw new HttpException(
        '배정받을 수 있는 사물함이 없습니다',
        HttpStatus.NOT_FOUND,
      );
    }
    const assignedLocker = lockers[0];
    await this.startWatingLocker(assignedLocker.lockerId, orderId);
    //1분 30초 뒤에도 대기상태리면.. 대기 상태를 없애자
    return await this.lockerRepository.findOne({
      select: ['lockerId', 'isUsing'],
      where: {
        lockerId: assignedLocker.lockerId,
      },
    });
  }

  public async getLockers() {
    return await this.lockerRepository.find();
  }

  public async getLockerById(lockerId: number) {
    const locker = await this.lockerRepository.findOne(lockerId);
    if (!locker) {
      throw new HttpException(
        `${lockerId}번 라커는 존재하지 않습니다.`,
        HttpStatus.NOT_FOUND,
      );
    }
    return locker;
  }
  //locker detail, locker history..
}
