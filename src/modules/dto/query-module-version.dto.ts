import { BuildStatus } from "src/common/constants/types";

export class QueryModuleVersionDto {
  current: number
  pageSize: number
  moduleId: number
  appId?: number
  version?: string
  description?: string
  status?: BuildStatus
}
