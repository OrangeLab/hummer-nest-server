import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, Put } from '@nestjs/common';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { GetRecordDto } from './dto/get-record.dto';

@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post('/createDepolyRecord')
  createDepolyRecord(@Body() createRecordDto: CreateRecordDto, @Request() req: any) {
    return this.recordsService.flowForward(createRecordDto, req.user);
  }

  @Patch(':id')
  updateDepolyRecord(@Param('id') id: string, @Body() updateRecordDto: CreateRecordDto,  @Request() req: any) {
    return this.recordsService.updateDepolyRecord(+id, updateRecordDto, req.user);
  }

  @Post('/flowForward')
  flowForward(@Body() createRecordDto: CreateRecordDto, @Request() req: any) {
    return this.recordsService.flowForward(createRecordDto, req.user);
  }

  @Get('/getRecordList')
  findAll(@Query() getRecordDto: GetRecordDto, @Request() req: any) {
    console.log('12312123')
    return this.recordsService.getRecordList(getRecordDto, req.user);
  }

  @Get('/newestVersion')
  newestVersion(@Query('appId') appId: string) {
    console.log('newestVersion')
    return this.recordsService.getNewestVersion(+appId);
  }

  @Post('/checkVersion')
  checkVersion(
    @Body() params: {
      appId: string,
      version: string,
      androidVersions: [],
      iosVersion: []
    }
  ) {
    return this.recordsService.checkVersion(params);
  }

  @Get('/getRecordDetail')
  findOne(@Query('recordId') recordId: any) {
    return this.recordsService.getRecordDetail(+recordId);
  }

  @Get('/getHistoryList')
  getHistoryList(@Query('recordId') recordId: any) {
    // TODO: 补全接口
    return ''
  }

  @Get('/getRecordNativeVersionsDetail')
  getRecordNativeVersionsDetail(@Query('recordId') recordId: any) {
    return this.recordsService.getRecordNativeVersionsDetail({recordId: +recordId});
  }


  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recordsService.remove(+id);
  }
}
