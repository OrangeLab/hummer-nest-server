import { forwardRef, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from 'src/applications/entities/application.entity';
import { Record } from 'src/records/entities/record.entity';
import { User } from 'src/users/entities/user.entity';
import { RecordsModule } from 'src/records/records.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Application, Record, User]), forwardRef(() => RecordsModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
