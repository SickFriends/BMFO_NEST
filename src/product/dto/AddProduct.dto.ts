import { UploadedFiles } from '@nestjs/common';

export class AddProductDto {
  name: string;
  category: string;
  imgUrl: string;
  price: number;
}
