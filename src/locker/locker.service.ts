import {
  HttpException,
  HttpService,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { OrderService } from 'src/order/order.service';
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

  public async openLocker(lockerId: number) {
    //라즈베리파이 플라스크서버에 오픈을 요청한다.
    await this.httpService
      .post('http://192.168.109.68:5000/openForSeller', {
        lockerId: lockerId,
      })
      .toPromise();
  }

  // 판매자가 라커 문을 열 때
  public async openLockerForSeller(lockerId: number) {
    const locker = await this.getLockerById(lockerId);
    if (!locker.isWating || !locker.isUsing) {
      throw new HttpException(
        '현재 주문이 할당되지 않은 라커이기때문에 문을 열 수 없습니다.',
        HttpStatus.SEE_OTHER,
      );
    }
    //라커에 물건을 넣을 때, 또는 추가시킬 때 라커를 대기상태로 업데이트 시키기
    await this.startWatingLocker(lockerId, locker.orderId);
    //그리고 문을 연다.
    await this.openLocker(lockerId);
  }

  public async closedForCustomer(lockerId: number, isIn: boolean) {
    const locker = await this.getLockerById(lockerId);
    // 문이 닫혔을 때 해당 라커가 주문 번호를 가지고 있고 대기중이고, 물건이 들어있다면, startUsingLocker()를 실행한다
    if (locker.isWating && isIn) {
      await this.startUsingLocker(lockerId, '');
    }
    // 라커가 사용중이었는데 문이 열리고 나서 물건이 비었다면
    if (locker.isUsing && !isIn) {
      await this.returnLocker(lockerId);
    }
    //문을 열고 나서 물건을 다 가지고 나가지 않았기 때문에 구매자가 물건을 다 가져갈 때 까지 다시 문을 연다.
    if (locker.isUsing && isIn) {
      await this.openLocker(lockerId);
    }
  }

  // 구매자가 라커 문을 열 때
  public async openForCustomer(lockerId: number, password: string) {
    const locker = await this.getLockerById(lockerId);
    const isSame = await this.checkLockerPass(lockerId, password);
    if (isSame) {
      //라즈베리 파이 플라스크 서버에 오픈을 요청한다.
      // 라커 문이 닫혔을 때, 라커를 반환한다.
      // await this.returnLocker(lockerId);
      await this.openLocker(lockerId);
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
    const locker: Locker = await this.lockerRepository.findOne({
      where: {
        lockerId,
      },
      select: ['password', 'lockerId', 'isUsing'],
    });
    if (!locker.isUsing) {
      //이 때, 현재 맡겨놓은 물건이 없는 라커이다.
      throw new HttpException(
        '현재 판매자로부터 상품이 할당 되지 않은 라커입니다',
        HttpStatus.BAD_GATEWAY,
      );
    }
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

  public async startUsingLocker(lockerId: number, lockerPassword: string) {
    await this.lockerRepository.update(
      {
        lockerId,
      },
      { isUsing: true, password: lockerPassword, isWating: false },
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

  public async assignLocker(
    orderId: string,
    lockerPassword: string,
  ): Promise<Locker> {
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
    //비밀번호를 라커에 업데이트 시킨다.
    await this.setLockerPassword(assignedLocker.lockerId, lockerPassword);
    // 라커를 대기상태로 업데이트 시킨다.
    await this.startWatingLocker(assignedLocker.lockerId, orderId);
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

  private async setLockerPassword(lockerId: number, lockerPassword: string) {
    await this.lockerRepository.update(
      {
        lockerId,
      },
      {
        password: lockerPassword,
      },
    );
  }
  //locker detail, locker history..
}
