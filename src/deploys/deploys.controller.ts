import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DeploysService } from './deploys.service';
import { CreateDeployDto } from './dto/create-deploy.dto';
import { UpdateDeployDto } from './dto/update-deploy.dto';

@Controller('deploys')
export class DeploysController {
  constructor(private readonly deploysService: DeploysService) {}

  @Post()
  create(@Body() createDeployDto: CreateDeployDto) {
    return this.deploysService.create(createDeployDto);
  }

  @Get()
  findAll() {
    return this.deploysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deploysService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeployDto: UpdateDeployDto) {
    return this.deploysService.update(+id, updateDeployDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deploysService.remove(+id);
  }
}
