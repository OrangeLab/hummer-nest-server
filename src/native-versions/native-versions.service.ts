import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { CreateNativeVersionDto } from './dto/create-native-version.dto';
import { GetNativeVersionDto } from './dto/get-native-version.dto';
import { UpdateNativeVersionDto } from './dto/update-native-version.dto';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NativeVersion } from './entities/native-version.entity';
import { LimitsService } from 'src/limits/limits.service';
import { UsersService } from 'src/users/users.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({
  scope: Scope.REQUEST
})
export class NativeVersionsService {
  constructor(
    @Inject(REQUEST)
    private request: Request,
    @InjectRepository(NativeVersion)
    private NativeVersionsRepository: Repository<NativeVersion>,
    private limitsService: LimitsService,
    private usersService: UsersService
  ) { }

  async createVersion(createNativeVersionDto: CreateNativeVersionDto) {
    const {
      version,
      platform,
      appId
    } = createNativeVersionDto

    const { user }: any = this.request
    await this.usersService.verifyCollaboratorCan(Number(appId), user)
    // 查询模块是否重名
    const nativeVersion = await this.NativeVersionsRepository.findOneBy({
      appId,
      version,
      platform
    }).catch((error) => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    console.log(nativeVersion)

    if (nativeVersion) {
      if (nativeVersion.isDeleted) {
        //彻底删除这条数据
        await this.NativeVersionsRepository.remove(nativeVersion).catch((error) => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })
      } else {
        throw new HttpException(`版本${version}已存在`, HttpStatus.BAD_REQUEST)
      }
    }

    // 灰度表相关操作
    // TODO: 处理删除情况, 查询开关并清空group 否则版本被删除后 相同版本创建会报错
    const limitInfo = await this.limitsService.createLimit({
      version,
      percent: 100,
      appId,
      platform
    }, user).catch((error) => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    if (!limitInfo?.generatedMaps[0].id) {
      throw new BadRequestException()
    }

    const res = await this.NativeVersionsRepository
      .createQueryBuilder()
      .insert()
      .into(NativeVersion)
      .values({
        ...createNativeVersionDto,
        operator: user.userName,
        operatorId: user.userId,
        limitId: limitInfo?.generatedMaps[0].id
      })
      .execute()
      .catch((error) => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const info = res.generatedMaps[0]
    return info
  }

  /**
   * @desc 分页获取端版本
  */
  async getVersionsByPage(getNativeVersionDto: GetNativeVersionDto) {
    const {
      pageSize,
      current,
      appId,
      platform,
      version = ''
    } = getNativeVersionDto

    const { user }: any = this.request
    await this.usersService.verifyCollaboratorCan(appId, user)

    const nativeVersions = await this.NativeVersionsRepository.find({
      where: {
        appId: Number(appId),
        platform: Number(platform),
        version: Like(`%${version}%`),
        isDeleted: 0,
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
      total: nativeVersions.length,
      list: nativeVersions
    }
  }


  async getVersions(appId: number, platform: number) {
    return await this.NativeVersionsRepository.find({
      where: {
        appId: Number(appId),
        platform: Number(platform),
        isDeleted: 0,
      }
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })
  }

  async getVersionDetail(id: number) {
    return await this.NativeVersionsRepository.find({
      where: {
        id
      }
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })
  }

  /**
   * @desc 修改版本信息
  */
  async editVersion(params: CreateNativeVersionDto) {
    const { appId, version, path, description, platform } = params;
    const { user }: any = this.request
    const res = await this.NativeVersionsRepository.update({
      appId,
      version,
      platform
    }, {
      operator: user.userName,
      operatorId: user.userId,
      path,
      description
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    return res;
  }

  /**
   * @desc 软删除
   */
  async deleteVersion(id: number) {
    const { user }: any = this.request
    const res = await this.NativeVersionsRepository.update({
      id
    }, {
      operator: user.userName,
      operatorId: user.userId,
      isDeleted: 1
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    return res;
  }
}
