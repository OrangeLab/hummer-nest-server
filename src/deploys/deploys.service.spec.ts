import { Test, TestingModule } from '@nestjs/testing';
import { DeploysService } from './deploys.service';

describe('DeploysService', () => {
  let service: DeploysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeploysService],
    }).compile();

    service = module.get<DeploysService>(DeploysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
