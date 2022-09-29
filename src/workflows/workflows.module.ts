import { forwardRef, Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workflow } from './entities/workflow.entity';
import { Auditor } from './entities/auditor.entity';
import { UsersModule } from 'src/users/users.module';
import { RecordWorkflowStatus } from './entities/record-workflow-status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Workflow, Auditor, RecordWorkflowStatus]), forwardRef(() => UsersModule)],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService]
})
export class WorkflowsModule {}
