import { EntityRepository, Repository } from 'typeorm';
import { LockerPass } from '../entity/LockerPass.entity';

@EntityRepository(LockerPass)
export class LockerPassRepository extends Repository<LockerPass> {}
