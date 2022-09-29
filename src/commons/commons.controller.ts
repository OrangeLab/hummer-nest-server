import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { noAuth } from 'src/common/decorator/noAuth.decorator';
import { CommonsService } from './commons.service';
import { CreateCommonDto } from './dto/create-common.dto';
import { UpdateCommonDto } from './dto/update-common.dto';

@Controller('commons')
export class CommonsController {
  constructor(private readonly commonsService: CommonsService) {}

  @Get('/changeLog')
  @noAuth()
  getChangeLog() {
    return this.commonsService.getChangeLog();
  }
}
