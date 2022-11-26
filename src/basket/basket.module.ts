import { Module } from '@nestjs/common';
import { BasketController } from './basket.controller';

@Module({
  imports: [],
  controllers: [BasketController],
  exports: [],
})
export class BasketModule {}
