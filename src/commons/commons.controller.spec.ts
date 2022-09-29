import { Test, TestingModule } from '@nestjs/testing';
import { CommonsController } from './commons.controller';
import { CommonsService } from './commons.service';

describe('CommonsController', () => {
  let controller: CommonsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommonsController],
      providers: [CommonsService],
    }).compile();

    controller = module.get<CommonsController>(CommonsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
