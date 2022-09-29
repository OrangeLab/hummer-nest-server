import { forwardRef, Module as NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeploysService } from './deploys.service';
import { DeploysController } from './deploys.controller';
import { Module } from 'src/modules/entities/module.entity';
import { Record } from 'src/records/entities/record.entity';
import { RecordVersion } from 'src/records/entities/record-version.entity';
import { NativeVersion } from 'src/native-versions/entities/native-version.entity';
import { RecordsService } from 'src/records/records.service';
import { RecordsModule } from 'src/records/records.module';

@NestModule({
  imports: [TypeOrmModule.forFeature([Module, Record, RecordVersion, NativeVersion]), forwardRef(() => RecordsModule)],
  controllers: [DeploysController],
  providers: [DeploysService],
  exports: [DeploysService]
})
export class DeploysModule {}
