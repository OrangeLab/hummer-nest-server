import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module } from 'src/modules/entities/module.entity';
import { generateConfig, generateJsonFile } from 'src/utils/deploy';
import { CreateDeployDto } from './dto/create-deploy.dto';
import { UpdateDeployDto } from './dto/update-deploy.dto';
import { DeployStatus, PlatformMapV2 } from 'src/common/constants/types';
import { Record } from 'src/records/entities/record.entity';
import { RecordVersion } from 'src/records/entities/record-version.entity';
import { NativeVersion } from 'src/native-versions/entities/native-version.entity';
import { checkAndCreateDir, getPlatform } from 'src/utils';
import { cloneDeep } from 'lodash';
import { RecordsService } from 'src/records/records.service';
import * as path from 'path';
import * as fsExtra from 'fs-extra'
import { getPublicUrls, uploadLocalFileToRemote } from 'src/utils/oss';

// 发布配置
interface Config {
  needRepublish: boolean; // 是否是重新发布
  multiType: boolean; // 是否是混合发布
}

interface PublishParams {
  id: number;
  platform: string;
  version: string;
  env: string;
  versionId: number;
}

@Injectable()
export class DeploysService {
  constructor(
    @InjectRepository(Module)
    private ModulesRepository: Repository<Module>,
    @InjectRepository(Record)
    private RecordsRepository: Repository<Record>,
    @InjectRepository(RecordVersion)
    private RecordVersionsRepository: Repository<RecordVersion>,
    @InjectRepository(NativeVersion)
    private NativeVersionsRepository: Repository<NativeVersion>,
    @Inject(forwardRef(() => RecordsService))
    private recordsService: RecordsService
  ) { }

  async deploy(createDeployDto: CreateDeployDto) {
    // 部署前的脚本
    let config: any = createDeployDto;
    const { extraConfig, extraModuleConfig } = createDeployDto;
    config = generateConfig(config, extraConfig, extraModuleConfig);
    console.log('更新config', config)
    // 存储部署快照
    await this.RecordsRepository.createQueryBuilder()
      .update(Record)
      .set({ config: JSON.stringify(config) })
      .where("id = :id", { id: createDeployDto.id })
      .execute()
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })

    return true;
  }

  /**
   * 发布流程
   */
  async publish(recordId: number, env: string, platform = 0, config?: Config): Promise<number> {
    const { needRepublish } = config || {};
    console.log('======>publish')
    const recordInfo = await this.RecordsRepository.createQueryBuilder('record')
      .where('record.id = :recordId', { recordId })  
      .getOne()
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
      
      console.log('======>11111')

    const baseConfig = recordInfo?.config;

    if (!baseConfig) {
      throw new HttpException('请先发布测试环境', HttpStatus.BAD_REQUEST)
    }
    console.log('======>22222')

    // 测试环境重新发布, 修改状态
    if (needRepublish) {
      await this.RecordsRepository.createQueryBuilder()
        .update(Record)
        .set({ status: DeployStatus.PublishDevReady })
        .where("id = :recordId", { recordId })
        .execute()
        .catch(error => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })
    }
    console.log('======>33333')

    // 发布单里所有应用版本
    const recordVersions = await this.RecordVersionsRepository.createQueryBuilder('recordVersion')
      .where('recordVersion.recordId = :recordId', { recordId })
      .andWhere(platform ? 'recordVersion.platform = :platform' : {}, { platform })
      // 左联NativeVersion
      .leftJoinAndMapOne('recordVersion.nativeVersion', NativeVersion, 'nativeVersion', 'nativeVersion.id = recordVersion.versionId')
      .getMany()
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })

      console.log('======>44444', recordVersions)

    const versions = recordVersions.map(recordVersion => {
      return {
        id: recordVersion.id,
        versionId: recordVersion.versionId,
        // @ts-ignore
        version: recordVersion.nativeVersion.version,
        // @ts-ignore
        platform: recordVersion.nativeVersion.platform
      }
    })
    console.log(versions)

    try {
      // 批量发布配置
      console.log(typeof baseConfig, baseConfig)
      await this.batchPublishConfig(versions, baseConfig, env, recordId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return recordId;
  }

    /**
   * 发布配置
   * @param source 原始配置
   * @param config 聚合module后的配置
   */
     private async batchPublishConfig(
      versionArray: Array<any>,
      config: any,
      env: any,
      recordId: number,
      needUpload = true
    ) {
      console.log('config', config)
      const res = await Promise.all(
        versionArray.map(async item => {
          const { version, platform, id, versionId } = item;
          const url = await this.publishConfig(
            {
              id,
              version,
              platform: getPlatform(platform),
              env,
              versionId // 用来查找稳定版本
            },
            cloneDeep(JSON.parse(config)),
            recordId,
            needUpload
          );
  
          return url;
        })
      );
      return res;
    }

    private async publishConfig(
      params: PublishParams,
      config: any,
      recordId: number,
      needUpload = true
    ) {
      console.log('========', config)
      // 聚合配置
      const { version, platform, env, id, versionId } = params;
      config.native_version = version;
      config.platform = platform;
      // config.env = env; // 去除Env的处理逻辑
      // 进行稳定版本Module配置的聚合
      // 测试环境进行配置聚合，线上不做处理
      if (env && env !== "prod") {
        // env dev: 测试 prod: 正式
        config = await this.mergeStableConfig(versionId, config);
        // 根据平台筛选对应的模块文件
        const index = PlatformMapV2[platform] || 0;
        const takeKey = str => {
          let matched = str.split(":");
          matched = matched[index];
          return matched || str;
        };
        config.modules = config.modules.map(mod => {
          let { key, md5 } = mod;
          key = takeKey(key);
          md5 = takeKey(md5);
          return {
            ...mod,
            md5,
            key
          };
        });
        // 记录发布内容
        await this.updateRecordVersionUrl({
          id,
          content: JSON.stringify(config)
        });
      } else {
        // 如果是发布到线上，使用测试环境对应的配置
        config = await this.getStableConfigById(id);
        // 更新稳定版
        await this.recordsService.markStableVersion(recordId);
      }
      if (!needUpload) {
        return;
      }
      const url = await this.uploadConfigJson(config, env);
      // 记录发布链接
      await this.updateRecordVersionUrl({
        id,
        url
      });
  
      console.log(url)
      return url;
    }

      /**
   * 当前配置和稳定版进行聚合，返回新的配置
   * @param versionId
   * @param config
   */
  private async mergeStableConfig(
    versionId: number,
    config: any
  ): Promise<any> {
    if (!versionId) {
      return config;
    }
    const newConfig = { ...config };
    const stableModuleMap = new Map();
    const nativeVersion = await this.NativeVersionsRepository.createQueryBuilder('nativeVersion')
        .where('nativeVersion.id = :versionId', {versionId})
        .getOne()
        .catch(error => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })
    console.log('nativeVersion', nativeVersion)
  const stableVersionId = nativeVersion.stableVersionId

    const tempModule: Array<any> = [];
    if (stableVersionId) {
      const recordVersion = await this.RecordVersionsRepository.createQueryBuilder('recordVersion')
        .where('recordVersion.id = :stableVersionId', {stableVersionId})
        .getOne()
        .catch(error => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })
      let stableConfig = recordVersion.config && JSON.parse(recordVersion.config)
      if (stableConfig) {
        if (typeof stableConfig === "string") {
          stableConfig = JSON.parse(stableConfig);
        }
        stableConfig.modules.forEach(module => {
          const { module_id } = module;
          stableModuleMap.set(module_id, module);
        });
        config.modules.forEach(module => {
          const { module_id } = module;
          stableModuleMap.set(module_id, module);
        });
        stableModuleMap.forEach(module => {
          tempModule.push(module);
        });
        newConfig.modules = tempModule;
      }
    }
    return newConfig;
  }

    /**
   * 上传配置文件
   * @param config
   */
     private async uploadConfigJson(config: any, env: string) {
      if (!config) {
        throw new HttpException('[ERROR]: 配置内容为空, 请先发布', HttpStatus.INTERNAL_SERVER_ERROR)
      }
      console.log(typeof config, config)
      const { app_id, native_version, platform } = config;
      const nativeVersion = native_version ? `_${native_version}` : "";
      let jsonName = `hummer_${app_id}_${platform}${nativeVersion}`;
      if (env && env !== "prod") {
        jsonName += `_${env}`;
      }
      
      const context = path.join(
        process.env.HOME_PATH || "",
        "/temp/hummer"
      )
      checkAndCreateDir(context);
      const jsonPath = path.join(context, `${jsonName}.json`);
      console.log('context', context, jsonPath)

      try {
        await generateJsonFile(
          {
            ...config
          },
          jsonPath
        );
      } catch (e) {
        throw new HttpException(`[ERROR]: 临时文件写入失败, ${e}`, HttpStatus.INTERNAL_SERVER_ERROR)
      }
  
      try {
        const fileName = `${jsonName}.json`;
        await uploadLocalFileToRemote({
          filename: `config/${fileName}`,
          localPath: jsonPath,
        });
        fsExtra.removeSync(jsonPath);
        const url = getPublicUrls([`config/${fileName}`])[0];
        //TODO: 针对cdn进行刷新
        
  
        return url;
      } catch (e) {
        throw new HttpException(`[ERROR]: 上传失败, ${e}`, HttpStatus.INTERNAL_SERVER_ERROR)
      }
    }

    /**
   * 获取当前应用版本的稳定版
   * @param id RecordVersion id
   */
     private async getStableConfigById(id: number): Promise<any> {
      const recordVersion = await this.RecordVersionsRepository.createQueryBuilder('recordVersion')
        .where('recordVersion.id = :id', {id})
        .getOne()
        .catch(error => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })
      let config = recordVersion.config

      if (typeof config === "string") {
        config = JSON.parse(config);
      }
      return config;
    }

  private async updateRecordVersionUrl(params: any) {
    const { id, url = "", content = "" } = params;
    const data: any = {};
    if (url) {
      data.configPath = url;
    }
    if (content) {
      data.config = content;
    }
    if (url || content) {
      data.packageKey = ""; // 兜底包key置空
    }

    await this.RecordVersionsRepository.createQueryBuilder()
      .update(RecordVersion)
      .set(data)
      .where("id = :id", { id })
      .execute()
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
  }

  create(createDeployDto: CreateDeployDto) {
    return 'This action adds a new deploy';
  }

  findAll() {
    return `This action returns all deploys`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deploy`;
  }

  update(id: number, updateDeployDto: UpdateDeployDto) {
    return `This action updates a #${id} deploy`;
  }

  remove(id: number) {
    return `This action removes a #${id} deploy`;
  }
}
