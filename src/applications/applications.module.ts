import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Application } from './entities/application.entity';

import { UsersModule } from 'src/users/users.module';
import { Collaborator } from 'src/users/entities/collaborator.entity';
import { WorkflowsModule } from 'src/workflows/workflows.module';
import { UserFavoriteApplication } from './entities/userFavoriteApplication';
import { UsersService } from 'src/users/users.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
@Module({
  imports: [TypeOrmModule.forFeature([Application, Collaborator, UserFavoriteApplication]),forwardRef(() => UsersModule), WorkflowsModule, forwardRef(() => NotificationsModule) ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService]
})
export class ApplicationsModule {}
