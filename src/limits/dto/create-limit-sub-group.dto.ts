export class CreateLimitSubGroupDto {
  id: number;
  percent?: number;
  configVersion: string; // 发布version
  description?: string;
  device?: string;
  city?: string;
  type: string;
}
