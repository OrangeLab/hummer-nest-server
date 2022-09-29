import { PartialType } from '@nestjs/mapped-types';
import { CreateModuleVersionDto } from './create-module-version.dto';

export class UpdateModuleVersionDto extends PartialType(CreateModuleVersionDto) {
  id: number
}
