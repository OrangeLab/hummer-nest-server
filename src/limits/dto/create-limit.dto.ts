export class CreateLimitDto {
  version: string
  appId: number
  extraId?: number // 外部定义的appKey
  platform: number
  config?: string
  percent: number
  description?: string // 发布单中的版本描述（同步到开关中对外展示）
}
