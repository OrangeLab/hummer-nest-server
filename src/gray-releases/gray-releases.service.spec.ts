import { Test, TestingModule } from '@nestjs/testing';
import { GrayReleasesService } from './gray-releases.service';

describe('GrayReleasesService', () => {
  let service: GrayReleasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GrayReleasesService],
    }).compile();

    service = module.get<GrayReleasesService>(GrayReleasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
