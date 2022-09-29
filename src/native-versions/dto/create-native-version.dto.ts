export class CreateNativeVersionDto {
  appId: number
  version: string
  platform: number
  description?: string
  path?: string
}
