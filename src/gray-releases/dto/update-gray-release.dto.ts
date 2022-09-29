import { PartialType } from '@nestjs/mapped-types';
import { CreateGrayReleaseDto } from './create-gray-release.dto';

export class UpdateGrayReleaseDto extends PartialType(CreateGrayReleaseDto) {}
