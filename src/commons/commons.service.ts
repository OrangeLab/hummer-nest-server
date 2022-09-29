import { Injectable } from '@nestjs/common';
import { CreateCommonDto } from './dto/create-common.dto';
import { UpdateCommonDto } from './dto/update-common.dto';

@Injectable()
export class CommonsService {
  getChangeLog() {
    // TODO:获取更新日志
    return []
  }
}
