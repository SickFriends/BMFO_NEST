import { HttpModule, Module } from '@nestjs/common';
import { LockerService } from './locker.service';
import { LockerController } from './locker.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LockerRepository } from './repository/locker.repository';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([LockerRepository])],
  providers: [LockerService],
  controllers: [LockerController],
  exports: [TypeOrmModule, LockerService],
})
export class LockerModule {}
