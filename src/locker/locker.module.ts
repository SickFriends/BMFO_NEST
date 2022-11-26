import { Module } from '@nestjs/common';
import { LockerService } from './locker.service';
import { LockerController } from './locker.controller';

@Module({
  providers: [LockerService],
  controllers: [LockerController]
})
export class LockerModule {}
