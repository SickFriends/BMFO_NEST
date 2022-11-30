import { HttpModule, Module } from '@nestjs/common';
import { LockerService } from './locker.service';
import { LockerController } from './locker.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LockerRepository } from './repository/locker.repository';
import { TaskModule } from 'src/task/task.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([LockerRepository]),
    TaskModule,
  ],
  providers: [LockerService],
  controllers: [LockerController],
  exports: [TypeOrmModule, LockerService],
})
export class LockerModule {}
