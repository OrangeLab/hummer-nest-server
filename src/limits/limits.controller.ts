import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Put } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { CreateLimitDto } from './dto/create-limit.dto';
import { UpdateLimitDto } from './dto/update-limit.dto';
import { CreateLimitSubGroupDto } from './dto/create-limit-sub-group.dto';

@Controller('limits')
export class LimitsController {
  constructor(private readonly limitsService: LimitsService) {}

  @Post('/createLimitSubGroup')
  create(@Body() createLimitSubGroupDto: CreateLimitSubGroupDto) {
    return this.limitsService.createLimitSubGroup(createLimitSubGroupDto);
  }

  @Put('/updateLimitSubGroup')
  updateLimitSubGroup(@Query() createLimitSubGroupDto: CreateLimitSubGroupDto & {limitId: number}) {
    console.log('put', createLimitSubGroupDto)
    return this.limitsService.updateLimitSubGroup(createLimitSubGroupDto);
  }

  @Get('/stopLimitSubGroup')
  stopLimitSubGroup(@Query() query: {id: number}) {
    return this.limitsService.stopLimitSubGroup(query);
  }

  @Put('/terminateLimit')
  terminateLimit(@Query() query: {id: number}) {
    return this.limitsService.terminateLimit(query);
  }
}
