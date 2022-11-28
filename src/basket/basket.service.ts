import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Product } from 'src/product/entity/product.entity';
import { ProductService } from 'src/product/product.service';
import { User } from 'src/user/entity/user.entity';
import { GetBasketResponseDto } from './dto/GetBasketResponse.dto';
import { PutProductRequestDto } from './dto/PutProductRequest.dto';
import { Basket } from './entity/basket.entity';
import { BasketProduct } from './entity/basketProduct.entity';
import { BasketRepository } from './repository/basket.repository';
import { BasketProductRepository } from './repository/basketProduct.repository';

@Injectable()
export class BasketService {
  constructor(
    private basketRepository: BasketRepository,
    private basketProductRepository: BasketProductRepository,
    private productService: ProductService,
  ) {}

  public async getShoppingBasket(user: User): Promise<GetBasketResponseDto[]> {
    let basket: Basket = await this.basketRepository.findOne({
      where: {
        userId: user.userId,
      },
      relations: ['basketProducts', 'basketProducts.product'],
    });
    const resProducts: GetBasketResponseDto[] = [];
    if (!basket) {
      const newbasket = new Basket();
      newbasket.userId = user.userId;
      basket = await newbasket.save();
      return resProducts;
    }
    const { basketProducts } = basket;
    await Promise.all(
      basketProducts.map((productInfo) => {
        console.log(productInfo);
        resProducts.push({
          count: productInfo.count,
          product: productInfo.product,
          basketProductId: productInfo.id,
        });
      }),
    );
    console.log(resProducts);
    return resProducts;
  }

  public async putProduct(req: PutProductRequestDto): Promise<void> {
    let basket: Basket = await this.basketRepository.findOne({
      where: {
        userId: req.ownerId,
      },
    });
    if (!basket) {
      throw new HttpException('장바구니가 없습니다', HttpStatus.NOT_FOUND);
    }
    const product: Product = await this.productService.getOneProduct(
      req.productId,
    );
    const newBasketProduct: BasketProduct = new BasketProduct();
    newBasketProduct.basketId = basket.basketId;
    newBasketProduct.count = req.cnt;
    newBasketProduct.productId = product.productId;
    this.basketProductRepository.save(newBasketProduct);
  }

  public async getBasketByUserId(userId: number): Promise<Basket> {
    let basket: Basket = await this.basketRepository.findOne({
      where: {
        userId: userId,
      },
    });
    if (!basket) {
      throw new HttpException('', HttpStatus.NOT_FOUND);
    }
    return basket;
  }

  public async deleteAll(userId: number): Promise<void> {
    let basket: Basket = await this.getBasketByUserId(userId);
    await this.basketProductRepository.delete({
      basketId: basket.basketId,
    });
  }

  public async deleteBaketProduct(
    userId: number,
    basketProductId: number,
  ): Promise<void> {
    const basket: Basket = await this.getBasketByUserId(userId);
    if (basket.userId === userId) {
      await this.basketProductRepository.delete({
        id: basketProductId,
      });
    }
  }
}
