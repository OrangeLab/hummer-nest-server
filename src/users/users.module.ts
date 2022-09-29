import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { HttpModule } from '@nestjs/axios';
import { Collaborator } from 'src/users/entities/collaborator.entity';
import { Privilege } from './entities/privilege.entity';
import { RolePrivilege } from './entities/rolePrivilege.entity';
import { UserRole } from './entities/userRole.entity';
import { Application } from 'src/applications/entities/application.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Collaborator, Privilege, RolePrivilege, UserRole, Application]), HttpModule, forwardRef(() => NotificationsModule) ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
