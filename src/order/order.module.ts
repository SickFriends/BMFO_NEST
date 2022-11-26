import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderRepository } from './repository/order.repository';
import { OrderedProductRepository } from './repository/orderProduct.repository';
import { LockerModule } from 'src/locker/locker.module';
import { BasketModule } from 'src/basket/basket.module';
import { LockerService } from 'src/locker/locker.service';
import { TaskModule } from 'src/task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderRepository, OrderedProductRepository]),
    LockerModule,
    BasketModule,
    TaskModule,
  ],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [TypeOrmModule],
})
export class OrderModule {}
