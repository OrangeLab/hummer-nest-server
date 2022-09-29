export class CreateDeployDto {
  modules: object[];
  appId: number;
  version: string;
  description: string;
  type: number;
  mode: number;
  isMandatory: number;
  platforms: string[];
  androidVersions: number[];
  iosVersions: number[];
  id: number;
  extraConfig?: any;
  extraModuleConfig?: any;
}
