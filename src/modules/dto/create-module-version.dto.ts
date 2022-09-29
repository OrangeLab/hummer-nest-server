import { Blob } from "buffer"

export class CreateModuleVersionDto {
  moduleId: number
  version: string
  description: string
  distType: string
  dist: any
  minVersion: string
  jobName: string
  lazyDownload: number
  isMandatory: number
  lazyLoad: number
}
