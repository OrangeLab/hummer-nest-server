import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Module } from './entities/module.entity';
import { ModuleVersion } from './entities/module-version.entity';
import { QueryModuleDto } from './dto/query-module.dto';
import { QueryModuleVersionDto } from './dto/query-module-version.dto';
import { CreateModuleVersionDto } from './dto/create-module-version.dto';
import { BuildsService } from 'src/builds/builds.service';
import { BuildStatus } from 'src/common/constants/types';
import { getPublicUrls } from 'src/utils/oss';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { isEmpty } from 'lodash';
import { UpdateModuleVersionDto } from './dto/update-module-version.dto';

@Injectable({
  scope: Scope.REQUEST
})
export class ModulesService {
  constructor(
    @Inject(REQUEST)
    private request: Request,
    @InjectRepository(Module)
    private ModulesRepository: Repository<Module>,
    @InjectRepository(ModuleVersion)
    private ModuleVersionsRepository: Repository<ModuleVersion>,
    private buildsSerive: BuildsService
  ) { }

  async createModule(createModuleDto: CreateModuleDto) {
    const {
      name,
      appId
    } = createModuleDto
    const { user }: any = this.request

    // 查询模块是否重名
    const module = await this.ModulesRepository.findOneBy({
      appId,
      isDeleted: 0,
      name
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    if (module) {
      throw new HttpException(`模块${name}已存在`, HttpStatus.BAD_REQUEST)
    }

    const res = await this.ModulesRepository
      .createQueryBuilder()
      .insert()
      .into(Module)
      .values({
        ...createModuleDto,
        creator: user.userName,
        creatorId: user.userId,
        operator: user.userName,
        operatorId: user.userId
      })
      .execute()
      .catch((error) => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const info = res.generatedMaps[0]
    return info
  }

  async getModules(appId: number) {
    const modules = await this.ModulesRepository.find({
      where: {
        appId: Number(appId),
      }
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    return modules
  }

  async getModulesByPage(query: QueryModuleDto) {
    const {
      current,
      pageSize,
      appId,
      name = ''
    } = query
    const modules = await this.ModulesRepository.find({
      where: {
        appId: Number(appId),
        isDeleted: 0,
        name: Like(`%${name}%`),
      },
      order: {
        createdAt: 'DESC'
      },
      take: Number(pageSize),
      skip: Number(pageSize) * (Number(current) - 1)
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    return {
      total: modules.length,
      list: modules
    }
  }

  async getModulesWithLastestVersion(appId: number) {
    const modules = await this.ModulesRepository.find({
      where: {
        appId,
        isDeleted: 0
      },
      order: {
        createdAt: 'DESC'
      }
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    const modulesWithLastestVersion = await Promise.all(
      modules.map(async module => {
        const versionInfo = await this.ModuleVersionsRepository.findOneBy(
          { id: module.lastestVersionId }
        );
        return {
          ...module,
          lastestVersion: versionInfo?.version || ""
        };
      })
    );

    return modulesWithLastestVersion
  }

  async getModuleVersions(query: QueryModuleVersionDto) {
    const {
      current = 1,
      pageSize,
      moduleId,
      description = '',
      status
    } = query
    console.log('123123', query)
    const moduleVersions = await this.ModuleVersionsRepository.find({
      where: {
        moduleId,
        isDeleted: 0,
        description: Like(`%${description}%`),
      },
      order: {
        createdAt: 'DESC'
      },
      take: Number(pageSize),
      skip: Number(pageSize) * (Number(current) - 1)
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    console.log(moduleVersions)

    const filenames: string[] = [];
    moduleVersions.forEach(item => {
      const { filename, moduleId: mid, lastPackageId } = item;
      filenames.push(...(filename.split(":").filter(Boolean) || []));
    });

    console.log(1111111)

    const publicUrls = getPublicUrls(filenames)


    console.log(222222)

    // TODO: 构建状态相关处理 远程构建会有状态  本地上传和链接  先默认成功处理
    const moduleVersionsWithStatus = moduleVersions.map(moduleVersion => {
      const {
        createdAt,
        description: desc,
        dist,
        distType,
        filename,
        id,
        moduleId: mid,
        operator,
        operatorId,
        updatedAt,
        version,
        minVersion = "",
        lastPackageId,
        lazyLoad,
        lazyDownload,
        isMandatory
      } = moduleVersion;

      let status = 0;
      let buildId = "";
      let queueId = "";
      let buildLink = "";
      let logLink = "";
      let jobName = "";
      const names: string[] = filename.split(":").filter(Boolean);
      const files = names.map((name: string) => {
        // eslint-disable-next-line no-param-reassign
        const index = filenames.indexOf(name);
        return {
          filename: name,
          url: publicUrls[index]
        };
      });
      return {

        createdAt,
        description: desc,
        dist,
        distType,
        id,
        // isDeleted,
        moduleId: mid,
        operator,
        operatorId,
        updatedAt,
        version,
        minVersion,
        files,
        status: status || BuildStatus.Success,
        buildId,
        buildLink,
        logLink,
        jobName,
        lazyLoad,
        lazyDownload,
        isMandatory

      }
    })

    return {
      total: moduleVersionsWithStatus.length,
      list: moduleVersionsWithStatus
    }
  }


  // 获取模块版本列表 - 不分页
  async getModuleVersionsByAppId(params) {
    const { appId: appid } = params;
    const appId = Number(appid);
    // 模块
    const modules = await this.getModules(params);

    return Promise.all(
      modules.map(async module => {
        const {
          id: moduleId,
          name,
          description,
          operator,
          updatedAt,
          lastestVersionId
        } = module;
        let lastestSuccessVersionId = lastestVersionId;

        // 模块对应的所有版本
        const versions = await this.ModuleVersionsRepository.find({
          where: {
            moduleId,
            isDeleted: 0
          },
          order: {
            createdAt: 'DESC'
          }
        }).catch(error => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })

        // TODO: 构建状态相关过滤
        const versionList: any[] = [];
        versions.forEach(version => {
          const { id: versionId } = version;
          {
            versionList.push({
              id: versionId,
              version: version.version,
              description: version.description,
              selected: versionId === lastestVersionId,
              updatedAt: version.updatedAt
            });
          }
        });
        lastestSuccessVersionId = versionList[0]?.id;

        return {
          appId,
          id: moduleId,
          name,
          description,
          operator,
          updatedAt,
          lastestVersionId,
          lastestSuccessVersionId,
          versions: versionList
        };
      })
    );
  }

  async createModuleVersion(createModuleVersionDto: CreateModuleVersionDto) {
    const { user }: any = this.request
    const {
      userId: operatorId,
      userName: operator
    } = user;
    const {
      moduleId,
      version,
      description = "",
      distType,
      dist,
      minVersion,
      jobName = "",
      lazyDownload = 0,
      isMandatory = 0,
      lazyLoad = 0
    } = createModuleVersionDto;

    const moduleVersion = await this.ModuleVersionsRepository.findOneBy({
      moduleId,
      version
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    const module = await this.getModule(moduleId);
    if (moduleVersion && !moduleVersion.isDeleted) {
      throw new HttpException(`模块${module.name}: 版本${version}已经存在`, HttpStatus.BAD_REQUEST)
    }

    // 构建
    let buildRes: any = {};
    let { repo, distPath = "dist" } = module;
    // 处理以/开头的情况
    distPath =
      (distPath?.startsWith("/") ? distPath.replace(/^\//, "") : distPath) ||
      "dist";
    // 非在线构建状态
    if (distType !== "online") {
      buildRes = await this.buildsSerive.buildModule({
        appId: module.appId,
        moduleId,
        distType,
        dist,
        repo,
        distPath,
        moduleName: module.name,
      })
    }
    const { filename = "", md5: md5Str = "", distname = "" } = buildRes;

    if (moduleVersion && moduleVersion.isDeleted) {
      // 硬删除数据
      await this.ModuleVersionsRepository
        .remove(moduleVersion)
        .catch(error => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })
    }
    // 记录module版本
    const res = await this.ModuleVersionsRepository
      .createQueryBuilder()
      .insert()
      .into(ModuleVersion)
      .values({
        moduleId,
        version,
        minVersion,
        description,
        md5: md5Str,
        filename,
        distType,
        dist:
          distname || (typeof dist === "string" ? dist : dist?.filename) || "",
        operator,
        operatorId,
        lazyDownload: lazyDownload ? 1 : 0,
        isMandatory: isMandatory ? 1 : 0,
        lazyLoad: lazyLoad ? 1 : 0
      })
      .execute()
      .catch((error) => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
    // 更新module的lastestVersion
    await this.ModulesRepository.createQueryBuilder()
      .update(Module)
      .set({ lastestVersionId: res.identifiers[0].id })
      .where("id = :id", { id: moduleId })
      .execute()
      .catch((error) => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      });

    if (distType == 'online') {
      // TODO: 线上构建
    }

    return res.generatedMaps[0]

  }

  async updateModuleVersion(updateModuleVersionDto: UpdateModuleVersionDto) {
    const { id } = updateModuleVersionDto;
    const { user }: any = this.request;

    const existOne = await this.ModuleVersionsRepository.findOne({
      where: { id }
    });
    const changedFields = {};
    const fieldKeys = ["version", "description"];
    fieldKeys.forEach(key => {
      if (updateModuleVersionDto[key] && updateModuleVersionDto[key] !== existOne[key]) {
        changedFields[key] = updateModuleVersionDto[key];
      }
    });
    const res = await this.ModuleVersionsRepository.update({
      id
    },
      {
        ...changedFields,
        operator: user.userName,
        operatorId: user.userId
      });
    return res;
  }

  // 删除模块版本
  async deleteModuleVersion(params: { moduleId: number, id: number }) {
    const { id, moduleId } = params;
    const { userName: operator, userId: operatorId } = (this.request as any).user
    const res = await this.ModuleVersionsRepository.update(
      {
        id,
        moduleId
      },
      {
        isDeleted: 1,
        operator,
        operatorId
      }
    );

    // 同步最近的模块版本
    const info = await this.ModuleVersionsRepository.find({
      where: {
        moduleId,
        isDeleted: 0
      },
      order: {
        createdAt: 'DESC'
      }
    });
    // 如果把最大的这个版本删除了, 就更新modules表记录的最新版本的id
    const mid = info && info[0] && info[0].moduleId;
    if (mid && mid !== moduleId) {
      await this.ModulesRepository.update({ id: mid }, { lastestVersionId: info[0].id })
    }

    return res;
  }

  async getModule(id: number) {
    const module = await this.ModulesRepository
      .findOneBy({
        id
      }).catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
    // TODO: job信息

    return {
      ...(module || {}),
      jobName: ""
    };
  }

  async updateModule(updateModuleDto: UpdateModuleDto) {
    const {
      id,
      name,
      repo,
      description = "",
      distPath = "",
      appId,
      flag = ""
    } = updateModuleDto;

    const { user }: any = this.request

    const res = await this.ModulesRepository.update(
      { id },
      {
        name,
        repo,
        description,
        distPath,
        flag,
        operator: user.userName,
        operatorId: user.userId
      }
    );
    return res;
  }

  async deleteModule(id: number) {
    const { user }: any = this.request

    const res = await this.ModulesRepository.update({
      id
    },
      {
        isDeleted: 1,
        operator: user.userName,
        operatorId: user.userId
      }
    );

    return res;
  }
}
