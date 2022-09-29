import { Module } from '@nestjs/common';
import { BuildsService } from './builds.service';
import { BuildsController } from './builds.controller';

@Module({
  controllers: [BuildsController],
  providers: [BuildsService]
})
export class BuildsModule {}
