import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/auth/decorator/role.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { multerOptions } from 'src/common/utils';
import { RoleType } from 'src/user/role-type';
import { AddProductDto } from './dto/AddProduct.dto';
import { ProductService } from './product.service';

@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}
  //판매자 입장에서 상품 추가할 수 있는 API이다.
  @Post('addProduct')
  @UseGuards(AuthGuard)
  @Roles(RoleType.SELLER)
  @UseInterceptors(FilesInterceptor('img', 1, multerOptions('products')))
  async addProduct(
    @UploadedFiles() img: Express.Multer.File[],
    @Body() addProductDto: AddProductDto,
  ) {
    addProductDto.imgUrl = img[0].filename;
    return await this.productService.addProduct(addProductDto);
  }

  //상품 리스트를 불러오는 API이다.
  @Get('list')
  async getProductList() {
    return await this.productService.getProducts();
  }

  //상품 찾기
  @Get('/searchByNameInAll')
  async searchProductByName(@Query('name') name: string) {
    return await this.productService.searchByNameInAll(name);
  }

  @Get('/searchByNameAndCategory')
  async searchByNameAndCategory(
    @Param('name') name: string,
    @Param('category') category: string,
  ) {
    return await this.searchByNameAndCategory(name, category);
  }

  //상품 카테고리로 찾기
  @Get('/findbycate')
  async getCategoryProductList(@Query('category') category: string) {
    return await this.productService.findAllProductsByCategory(category);
  }

  //상품
  @Get('/getOneProduct')
  async getOneProduct(@Query('id') id: number) {
    return await this.productService.getOneProduct(id);
  }
}
