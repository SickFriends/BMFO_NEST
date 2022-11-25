import { Test, TestingModule } from '@nestjs/testing';
import { BascketController } from './bascket.controller';

describe('BascketController', () => {
  let controller: BascketController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BascketController],
    }).compile();

    controller = module.get<BascketController>(BascketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
