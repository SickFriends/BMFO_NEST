import { Module } from '@nestjs/common';
import { BascketController } from './bascket.controller';

@Module({
  controllers: [BascketController]
})
export class BascketModule {}
