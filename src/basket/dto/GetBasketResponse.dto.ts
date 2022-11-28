import { Product } from 'src/product/entity/product.entity';

export class GetBasketResponseDto {
  product: Product;
  count: number;
  basketProductId: number;
}
