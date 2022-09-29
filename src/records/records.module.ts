import { forwardRef, Module as NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { Record } from './entities/record.entity';
import { RecordVersion } from './entities/record-version.entity';
import { ModuleVersion } from 'src/modules/entities/module-version.entity';
import { RecordModuleVersion } from './entities/record-module-version.entity';
import { ApplicationsModule } from 'src/applications/applications.module';
import { Module } from 'src/modules/entities/module.entity';
import { DeploysService } from 'src/deploys/deploys.service';
import { NativeVersion } from 'src/native-versions/entities/native-version.entity';
import { RecordWorkflowStatus } from 'src/workflows/entities/record-workflow-status.entity';
import { Workflow } from 'src/workflows/entities/workflow.entity';
import { WorkflowsModule } from 'src/workflows/workflows.module';
import { DeploysModule } from 'src/deploys/deploys.module';

@NestModule({
  imports: [TypeOrmModule.forFeature([Record, RecordVersion, ModuleVersion, RecordModuleVersion, Module, NativeVersion, RecordWorkflowStatus, Workflow]), forwardRef(() => ApplicationsModule), WorkflowsModule, forwardRef(() => DeploysModule)],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService]
})
export class RecordsModule {}
