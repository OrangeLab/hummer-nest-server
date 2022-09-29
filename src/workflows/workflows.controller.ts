import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  create(@Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowsService.createWorkflow(createWorkflowDto);
  }

  @Get('appWorkflow')
  getAppWorkflow(
    @Query() query: {appId: string, recordId: string},
    shouleGetAuditors: boolean = true,
    shouldGetUpdateTime: boolean = false
  ) {
    return this.workflowsService.getAppWorkflow(query, shouleGetAuditors, shouldGetUpdateTime);
  }

  @Put('appWorkflow')
  createWorkflow(
    @Body() params: CreateWorkflowDto
  ) {
    return this.workflowsService.createWorkflow(params);
  }
  

  @Get()
  findAll() {
    return this.workflowsService.findAll();
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto) {
    return this.workflowsService.update(+id, updateWorkflowDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workflowsService.remove(+id);
  }
}
