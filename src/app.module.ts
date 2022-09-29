import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ApplicationsModule } from './applications/applications.module';
import { CommonsModule } from './commons/commons.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { RecordsModule } from './records/records.module';
import { NativeVersionsModule } from './native-versions/native-versions.module';
import { ModulesModule } from './modules/modules.module';
import { BuildsModule } from './builds/builds.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { DeploysModule } from './deploys/deploys.module';
import { LimitsModule } from './limits/limits.module';
import { User } from './users/entities/user.entity';
import { NotificationsModule } from './notifications/notifications.module';
import config from './config';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      autoLoadEntities: true,
      synchronize: true,
      ...config.mysql
    }),
    TypeOrmModule.forFeature([User]),
    UsersModule,
    ApplicationsModule,
    CommonsModule,
    RecordsModule,
    NativeVersionsModule,
    ModulesModule,
    BuildsModule,
    WorkflowsModule,
    DeploysModule,
    LimitsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    }
  ],
})
export class AppModule { }
