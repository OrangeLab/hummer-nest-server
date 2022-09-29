import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NativeVersionsService } from './native-versions.service';
import { NativeVersionsController } from './native-versions.controller';
import { NativeVersion } from './entities/native-version.entity';
import { LimitsModule } from 'src/limits/limits.module';
import { UsersService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([NativeVersion]), LimitsModule, UsersModule],
  controllers: [NativeVersionsController],
  providers: [NativeVersionsService]
})
export class NativeVersionsModule {}
