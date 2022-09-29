import { PartialType } from '@nestjs/mapped-types';
import { CreateNativeVersionDto } from './create-native-version.dto';

export class UpdateNativeVersionDto extends PartialType(CreateNativeVersionDto) {}
