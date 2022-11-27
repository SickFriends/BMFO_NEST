import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Like, Raw } from 'typeorm';
import { AddProductDto } from './dto/AddProduct.dto';
import { Product } from './entity/product.entity';
import { ProductRepository } from './repository/product.repository';

@Injectable()
export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  public async getProducts(): Promise<Product[]> {
    return await this.productRepository.find();
  }

  public async findAllProductsByCategory(category: string): Promise<Product[]> {
    return await this.productRepository.find({
      where: {
        category,
      },
    });
  }

  public async addProduct(addProductDto: AddProductDto): Promise<void> {
    const newProduuct = new Product();
    newProduuct.category = addProductDto.category;
    newProduuct.name = addProductDto.name;
    newProduuct.price = addProductDto.price;
    newProduuct.imgUrl = addProductDto.imgUrl;
    Product.save(newProduuct);
  }

  public async searchByNameInAll(name: string) {
    return await this.productRepository.find({
      where: {
        name: Like(`%${name}%`),
      },
    });
  }

  public async searchByNameAndCategory(
    name: string,
    category: string,
  ): Promise<Product[]> {
    return await this.productRepository.find({
      where: {
        name: Like(`%${name}%`),
        category: category,
      },
    });
  }

  public async getOneProduct(id: number): Promise<Product> {
    const product: Product = await this.productRepository.findOne(id);
    console.log(product);
    if (!product)
      throw new HttpException('존재하지 않는 상품 ID', HttpStatus.NOT_FOUND);
    return product;
  }
}
