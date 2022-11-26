import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from 'src/product/product.module';
import { BasketController } from './basket.controller';
import { BasketService } from './basket.service';
import { BasketRepository } from './repository/basket.repository';
import { BasketProductRepository } from './repository/basketProduct.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([BasketProductRepository, BasketRepository]),
    ProductModule,
  ],
  controllers: [BasketController],
  exports: [TypeOrmModule, BasketService],
  providers: [BasketService],
})
export class BasketModule {}
