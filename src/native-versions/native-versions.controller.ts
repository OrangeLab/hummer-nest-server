import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Injectable, Req } from '@nestjs/common';
import { NativeVersionsService } from './native-versions.service';
import { CreateNativeVersionDto } from './dto/create-native-version.dto';
import { UpdateNativeVersionDto } from './dto/update-native-version.dto';
import { GetNativeVersionDto } from './dto/get-native-version.dto';
import { UsersService } from 'src/users/users.service';

@Controller('native-versions')
export class NativeVersionsController {
  constructor(
    private readonly nativeVersionsService: NativeVersionsService,
    private readonly usersService: UsersService
  ) {}

  @Post('/createVersion')
  createVersion(@Body() createNativeVersionDto: CreateNativeVersionDto) {
    return this.nativeVersionsService.createVersion(createNativeVersionDto);
  }

  @Get('/getVersionsByPage')
  getVersionsByPage(@Query() getNativeVersionDto: GetNativeVersionDto) {
    return this.nativeVersionsService.getVersionsByPage(getNativeVersionDto);
  }

  @Get('/getVersions')
  getVersions(@Query() query: any) {
    return this.nativeVersionsService.getVersions(+query.appId, +query.platform);
  }

  @Get('/getVersionDetail')
  getVersionDetail(@Query() query: any) {
    return this.nativeVersionsService.getVersionDetail(+query.id);
  }

  @Post('/editVersion')
  editVersion(@Body() createNativeVersionDto: CreateNativeVersionDto) {
    return this.nativeVersionsService.editVersion(createNativeVersionDto);
  }

  @Get('/deleteVersion')
  deleteVersion(@Query() params: {id: number | string}) {
    return this.nativeVersionsService.deleteVersion(Number(params.id));
  }
}
