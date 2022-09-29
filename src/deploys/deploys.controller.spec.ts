import { Test, TestingModule } from '@nestjs/testing';
import { DeploysController } from './deploys.controller';
import { DeploysService } from './deploys.service';

describe('DeploysController', () => {
  let controller: DeploysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeploysController],
      providers: [DeploysService],
    }).compile();

    controller = module.get<DeploysController>(DeploysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
