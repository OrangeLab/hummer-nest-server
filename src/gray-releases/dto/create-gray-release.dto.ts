export class CreateGrayReleaseDto {
    appId: number;
    appKey: number;
    platform: number;
    version: string; // native version
    percent: number;
    description?: string;
    config?: string;
}
