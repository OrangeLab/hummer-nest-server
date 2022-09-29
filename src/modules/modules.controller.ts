import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseInterceptors, UploadedFile, Put } from '@nestjs/common';
import { Express } from 'express'
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { QueryModuleDto } from './dto/query-module.dto';
import { QueryModuleVersionDto } from './dto/query-module-version.dto';
import { CreateModuleVersionDto } from './dto/create-module-version.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateNativeVersionDto } from 'src/native-versions/dto/update-native-version.dto';
import { UpdateModuleVersionDto } from './dto/update-module-version.dto';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) { }

  @Post('/createModule')
  createModule(@Body() createModuleDto: CreateModuleDto) {
    return this.modulesService.createModule(createModuleDto);
  }

  @Get('/getModules')
  getModules(@Query() query: { appId: string }) {
    return this.modulesService.getModules(Number(query.appId));
  }

  @Get('/getModulesByPage')
  getModulesByPage(@Query() query: QueryModuleDto) {
    return this.modulesService.getModulesByPage(query);
  }

  @Get('/getModulesWithLastestVersion')
  getModulesWithLastestVersion(@Query('appId') appId: string) {
    return this.modulesService.getModulesWithLastestVersion(+appId);
  }

  @Get('/getModuleVersions')
  getModuleVersions(@Query() query: QueryModuleVersionDto) {
    return this.modulesService.getModuleVersions(query);
  }

  @Get('/getModuleVersionsByAppId')
  getModuleVersionsByAppId(@Query('appId') appId: string) {
    return this.modulesService.getModuleVersionsByAppId({ appId: +appId });
  }

  @Post('/createModuleVersion')
  @UseInterceptors(FileInterceptor('dist'))
  createModuleVersion(@UploadedFile() file: Express.Multer.File, @Body() createModuleVersionDto: CreateModuleVersionDto) {
    createModuleVersionDto.dist = file
    return this.modulesService.createModuleVersion(createModuleVersionDto);
  }

  @Put('/updateModuleVersion')
  updateModuleVersion(@Body() updateModuleVersionDto: UpdateModuleVersionDto) {
    return this.modulesService.updateModuleVersion(updateModuleVersionDto);
  }

  @Get('/deleteModuleVersion')
  deleteModuleVersion(@Query() query: {moduleId: string, id: string}) {
    return this.modulesService.deleteModuleVersion({
      moduleId: Number(query.moduleId),
      id: Number(query.id)
    });
  }

  @Get('/getModule')
  getModule(@Query('id') id: string) {
    return this.modulesService.getModule(+id);
  }

  @Post('/updateModule')
  updateModule(@Body() updateModuleDto: UpdateModuleDto) {
    return this.modulesService.updateModule(updateModuleDto);
  }


  @Get('/deleteModule')
  deleteModule(@Query('moduleId') moduleId: string) {
    return this.modulesService.deleteModule(Number(moduleId));
  }
}
