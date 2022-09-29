import { Test, TestingModule } from '@nestjs/testing';
import { NativeVersionsService } from './native-versions.service';

describe('NativeVersionsService', () => {
  let service: NativeVersionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NativeVersionsService],
    }).compile();

    service = module.get<NativeVersionsService>(NativeVersionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
