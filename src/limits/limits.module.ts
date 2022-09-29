import { Module } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { LimitsController } from './limits.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from 'src/applications/entities/application.entity';
import { Limit } from './entities/limit.entity';
import { GrayReleasesService } from 'src/gray-releases/gray-releases.service';
import { LimitRecordVersion } from './entities/limit-record-version.entity';
import { Record } from 'src/records/entities/record.entity';
import { LimitRecordVersionLog } from './entities/limit-record-version-log.entity';
import { RecordVersion } from 'src/records/entities/record-version.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Limit, Application, LimitRecordVersion, LimitRecordVersionLog, Record, RecordVersion]), NotificationsModule],
  controllers: [LimitsController],
  providers: [LimitsService, GrayReleasesService],
  exports: [LimitsService]
})
export class LimitsModule {}
