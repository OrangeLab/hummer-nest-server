import { Test, TestingModule } from '@nestjs/testing';
import { NativeVersionsController } from './native-versions.controller';
import { NativeVersionsService } from './native-versions.service';

describe('NativeVersionsController', () => {
  let controller: NativeVersionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NativeVersionsController],
      providers: [NativeVersionsService],
    }).compile();

    controller = module.get<NativeVersionsController>(NativeVersionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
