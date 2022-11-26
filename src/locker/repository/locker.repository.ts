import { EntityRepository, Repository } from 'typeorm';
import { Locker } from '../entity/locker.entity';

@EntityRepository(Locker)
export class LockerRepository extends Repository<Locker> {}
