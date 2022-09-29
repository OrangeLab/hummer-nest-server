import { WorkflowActionEnum } from "src/common/constants/types";

interface ModuleType {
  moduleId: number;
  versionId: string;
  version: string;
}
export class CreateRecordDto {
  appId: number;
  recordId?: number;
  version: string;
  description: string;
  type: number;
  mode: number;
  isMandatory: number;
  platforms: Array<string>;
  androidVersions: Array<number>;
  iosVersions: Array<number>;
  modules: Array<ModuleType>;
  action?: WorkflowActionEnum;
  platform?: string;
  config?: string;
}
