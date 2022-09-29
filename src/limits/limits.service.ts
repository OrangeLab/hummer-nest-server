import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { intersection, isEmpty, last, union, uniq, without } from 'lodash';
import { Application } from 'src/applications/entities/application.entity';
import { LimitConfig } from 'src/common/constants';
import { NoticeType, PlatformEnum, WorkflowActionEnum } from 'src/common/constants/types';
import { GrayReleasesService } from 'src/gray-releases/gray-releases.service';
import { NativeVersion } from 'src/native-versions/entities/native-version.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { RecordVersion } from 'src/records/entities/record-version.entity';
import { Record } from 'src/records/entities/record.entity';
import { getNameByCityId } from 'src/utils/city';
import { Repository } from 'typeorm';
import { CreateLimitSubGroupDto } from './dto/create-limit-sub-group.dto';
import { CreateLimitDto } from './dto/create-limit.dto';
import { UpdateLimitDto } from './dto/update-limit.dto';
import { LimitRecordVersionLog } from './entities/limit-record-version-log.entity';
import { LimitRecordVersion } from './entities/limit-record-version.entity';
import { Limit } from './entities/limit.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

interface NewGroupParams {
  id: number; // RecordVersions id
  configVersion: string; // 发布单version
  description?: string;
  device?: string; // 设备唯一id
  city?: string;
  percent?: number;
}

@Injectable({
  scope: Scope.REQUEST
})
export class LimitsService {
  constructor(
    @Inject(REQUEST)
    private request: Request,
    @InjectRepository(Limit)
    private LimitsRepository: Repository<Limit>,
    @InjectRepository(Application)
    private ApplicationsRepository: Repository<Application>,
    @InjectRepository(Record)
    private RecordsRepository: Repository<Record>,
    @InjectRepository(RecordVersion)
    private RecordVersionsRepository: Repository<RecordVersion>,
    @InjectRepository(LimitRecordVersion)
    private LimitRecordVersionsRepository: Repository<LimitRecordVersion>,
    @InjectRepository(LimitRecordVersionLog)
    private LimitRecordVersionLogsRepository: Repository<LimitRecordVersionLog>,
    private grayReleasesService: GrayReleasesService,
    private notificationsService: NotificationsService
  ) { }

  create(createLimitDto: CreateLimitDto) {
    return 'This action adds a new limit';
  }

  async createLimit(params: CreateLimitDto, user: any) {
    const {
      version = "",
      appId,
      extraId, // 外部定义的appKey
      platform,
      config,
      percent,
      description // 发布单中的版本描述（同步到开关中对外展示）
    } = params;

    let appInfo: Application;
    if (appId) {
      appInfo = await this.ApplicationsRepository
        .createQueryBuilder('application')
        .where('application.id = :appId', {
          appId
        })
        .getOne().catch(error => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })
    }
    // 远程-创建开关
    const info = await this.grayReleasesService.createToggle({
      version, // native version
      appId,
      appKey: extraId || appInfo?.appId,
      platform,
      config,
      percent,
      description // 发布单中的版本描述（同步到开关中对外展示）
    });
    console.log(info)
    if (isEmpty(info)) {
      // todo logger
      throw new HttpException('开关信息创建失败', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    // 记录 todo: 日志添加
    // 记录详情信息
    const data = await this.LimitsRepository.findOne({
      where: {
        toggleName: info.toggleName
      }
    });
    // 去重
    if (data) {
      await this.LimitsRepository.remove(data)
    }
    const res = await this.LimitsRepository.insert({
      toggleId: info?.toggleId,
      toggleName: info?.toggleName,
      operator: user.userName,
      operatorId: user.userId
    });
    // 记录完成

    return res;
  }

  // 创建组——应用版本创建新发布
  async createLimitSubGroup(params: CreateLimitSubGroupDto) {
    const {
      id: recordVersionId,
      percent,
      configVersion,
      description = "",
      device,
      city
    } = params;
    const { user }: any = this.request
    // 关联 nativeVersion和limits表 查出limit信息

    const recordVersionInfo = await this.RecordVersionsRepository
      .createQueryBuilder('recordVersion')
      .where('recordVersion.id = :recordVersionId', { recordVersionId })
      // 左联nativeVersion
      .leftJoinAndMapOne('recordVersion.NativeVersion', NativeVersion, 'nativeVersion', 'recordVersion.versionId = nativeVersion.id')
      // 左联灰度表
      .leftJoinAndMapOne('recordVersion.NativeVersionLimit', Limit, 'limit', 'nativeVersion.limitId = limit.id')
      .getOne()
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })


    console.log('======>1')


    // 开关信息
    const limitInfo = recordVersionInfo?.NativeVersionLimit;
    const nativeVersionInfo = recordVersionInfo?.NativeVersion;

    const { recordId } = recordVersionInfo;
    const recordInfo = await this.RecordsRepository.findOne({
      where: {
        id: recordId
      }
    });
    const { appId } = recordInfo;

    console.log('======>2')

    if (isEmpty(limitInfo)) {
      throw new HttpException('没有开关信息', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const res = await this.createSubGroup({
      id: recordVersionId,
      percent,
      configVersion,
      description,
      device,
      city,
      limitId: limitInfo?.id,
      toggleId: limitInfo?.toggleId,
      limitName: limitInfo?.toggleName,
      config: recordVersionInfo?.config,
      appId,
      platform: nativeVersionInfo?.platform,
      version: nativeVersionInfo?.version
    }, user);
    console.log('======>3')

    // 通知服务
    this.notificationsService.doNotify(
      appId,
      NoticeType.UPDATE_LIMIT,
      {
        device,
        city,
        percent,
        recordId,
        nativeInfo: recordVersionInfo?.NativeVersion,
        description: recordInfo.description
      }
    );
    return res;
  }

  // 组调整
  async updateLimitSubGroup(params: CreateLimitSubGroupDto & { limitId: number }) {
    const {
      id: recordVersionId,
      limitId: limitGroupId,
      percent,
      description = ""
    } = params;
    const { user }: any = this.request


    // 对手机号、城市进行去重处理
    let { device = "", city = "" } = params;
    device = uniq(device.split(",")).join(",");
    city = uniq(city.split(",")).join(",");

    // 关联 nativeVersion和limits表 查出limit信息
    const recordVersionInfo = await this.RecordVersionsRepository
      .createQueryBuilder('recordVersion')
      .where('recordVersion.id = :recordVersionId', { recordVersionId })
      // 左联nativeVersion
      .leftJoinAndMapOne('recordVersion.NativeVersion', NativeVersion, 'nativeVersion', 'recordVersion.versionId = nativeVersion.id')
      // 左联灰度表
      .leftJoinAndMapOne('recordVersion.NativeVersionLimit', Limit, 'limit', 'nativeVersion.limitId = limit.id')
      .leftJoinAndMapOne('recordVersion.RecordVersionLimitsLog', LimitRecordVersionLog, 'limitRecordVersionLog', 'limitRecordVersionLog.recordVersionId = recordVersion.id')
      .getOne()
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })


    // 开关信息
    const limitInfo = recordVersionInfo?.NativeVersionLimit;
    const limitLogInfo = recordVersionInfo?.RecordVersionLimitsLog;

    const { recordId } = recordVersionInfo;
    const recordInfo = await this.RecordsRepository.findOne({
      where: {
        id: recordId
      }
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    const { appId } = recordInfo;

    if (isEmpty(limitInfo)) {
      throw new HttpException('未查询到开关信息, 请联系平台同学', HttpStatus.INTERNAL_SERVER_ERROR)
    }
    const groupInfo = await this.LimitRecordVersionsRepository.findOneBy({
      id: limitGroupId
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    });

    const isFullSet = Number(percent) === 100; // 全量

    const rules = this.grayReleasesService.getRules({ percent });
    const data = this.grayReleasesService.parseLimitSubGroupData({
      groupName: groupInfo?.name,
      rules,
      config: recordVersionInfo?.config
    });

    await this.grayReleasesService.updateToggleGroup(
      limitInfo?.toggleName,
      groupInfo?.name,
      data
    );
    // 灰度服务end

    this.notificationsService.doNotify(
      appId,
      isFullSet
        ? NoticeType.FULL_LIMIT
        : NoticeType.UPDATE_LIMIT,
      {
        device,
        city,
        percent,
        recordId,
        nativeInfo: recordVersionInfo?.NativeVersion,
        description: recordInfo.description
      }
    );

    const res = await this.LimitRecordVersionsRepository.update(
      {
        id: limitGroupId
      },
      {
        percent: Number(percent),
        device,
        city,
        description,
        status: isFullSet ? LimitConfig.done : groupInfo.status
      }
    ).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    // 获取上次的limitLog
    const preLimitLog: any[] = limitLogInfo?.limitLog as any[] || [];

    const cityNames = getNameByCityId(city as string);
    const deviceArr = device?.split(",");
    // 获取上次的灰度信息
    const lastPreLimitLog = last(preLimitLog) || {};
    const preCityNames = lastPreLimitLog?.city?.last || [];
    const preDevice = lastPreLimitLog?.device?.last || [];
    function handleData(pre, next): { [key: string]: string[] } {
      const unionArr: string[] = union(pre, next);
      // 取交集
      const insertArr: string[] = intersection(pre, next);
      const addArr = without(next, ...insertArr);
      const deleteArr = without(pre, ...insertArr);
      return {
        union: unionArr,
        add: addArr,
        delete: deleteArr
      };
    }

    const {
      union: unionCityNames,
      add: addCityNames,
      delete: deleteCityNames
    } = handleData(preCityNames, cityNames);
    const {
      union: unionDevice,
      add: addDevice,
      delete: deleteDevice
    } = handleData(preDevice, deviceArr);

    const limitLog = [
      ...preLimitLog,
      {
        ...lastPreLimitLog,
        percent,
        city: {
          union: unionCityNames,
          add: addCityNames,
          delete: deleteCityNames,
          last: cityNames
        },
        phone: {
          union: unionDevice,
          add: addDevice,
          delete: deleteDevice,
          last: deviceArr
        },
        operatorId: user.userId,
        operatorName: user.userName,
        date: Date.now()
      }
    ];

    await this.LimitRecordVersionLogsRepository.update(
      {
        recordVersionId
      },
      {
        limitLog: JSON.stringify(limitLog)
      }
    ).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    });

    return res;
  }

  async createSubGroup(
    params: NewGroupParams & {
      appId: number;
      limitId: number;
      toggleId: number;
      limitName: string;
      config: any;
      platform: number;
      version: string;
    },
    user: any
  ): Promise<any> {
    const {
      id: recordVersionId,
      percent,
      configVersion,
      description = "",
      city = "",
      limitId,
      toggleId,
      limitName,
      config,
      appId,
      platform,
      version
    } = params;

    // 创建灰度流量组时对设备号进行去重处理，城市在web端不会有重复值
    let { device = "" } = params;
    device = uniq(device.split(",")).join(",");

    // 创建灰度(创建自定义开关组)
    let groupInfo = {};
    const groupName = `${toggleId}_group_${configVersion.replace(/\./g, "")}`;

    // 灰度服务用
    const rules = this.grayReleasesService.getRules({
      percent,
      device,
      city
    });
    const grayData = this.grayReleasesService.parseLimitSubGroupData({
      groupName,
      rules,
      config
    });
    // 灰度服务用

    // 流量设置
    await this.grayReleasesService.createToggleGroup(limitName, grayData);

    // 记录详情信息
    const res = await this.LimitRecordVersionsRepository.insert({
      percent,
      city,
      device,
      limitId,
      recordVersionId,
      name: groupName,
      status: percent === 100 ? LimitConfig.done : LimitConfig.doing,
      operator: user.userName,
      operatorId: user.userId
    }).catch((error) => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    });
    // 记录完成
    console.log('000000000000000', 444444444, res)

    // 日志添加
    const cityNames = getNameByCityId(city);
    const deviceArr = device.split(",");
    let action = "";
    switch (platform) {
      case PlatformEnum.Android:
        action = WorkflowActionEnum.LIMIT_CONTROL_ANDROID;
        break;
      case PlatformEnum.Ios:
        action = WorkflowActionEnum.LIMIT_CONTROL_IOS;
        break;
      default:
        action = WorkflowActionEnum.LIMIT_CONTROL;
    }
    const limitLog = [
      {
        percent,
        city: {
          union: cityNames,
          add: cityNames,
          delete: [],
          last: cityNames
        },
        device: {
          union: deviceArr,
          add: deviceArr,
          delete: [],
          last: deviceArr
        },
        operatorId: user.userId,
        operatorName: user.userName,
        action,
        platform,
        version,
        date: Date.now()
      }
    ];
    await this.LimitRecordVersionLogsRepository.insert({
      recordVersionId,
      platform,
      version,
      action,
      limitLog: JSON.stringify(limitLog)
    }).catch((error) => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    });
    console.log('000000000000000', 5555555)

    return res?.generatedMaps[0];
  }

    // 获取灰度信息
    async getLimitRecord(limitId) {
      const limitInfo = await this.LimitRecordVersionsRepository.findOneBy({
        limitId
      });
  
      return {
        percent: limitInfo.percent
      };
    }
  
    async stopLimitSubGroup(params) {
      const { id } = params;
  
      const res = await this.LimitRecordVersionsRepository.update(
        {
          id
        },
        {
          status: LimitConfig.stop
        }
      );
  
      return res;
    }
  
    async terminateLimit(params: any): Promise<any> {
      const { id } = params;
      const { user: {
        userId, userName
      } }: any = this.request
      return this.LimitRecordVersionsRepository.insert({
        status: LimitConfig.terminated,
        recordVersionId: id,
        operator: userName,
        operatorId: userId
      });
    }

  findAll() {
    return `This action returns all limits`;
  }

  findOne(id: number) {
    return `This action returns a #${id} limit`;
  }

  update(id: number, updateLimitDto: UpdateLimitDto) {
    return `This action updates a #${id} limit`;
  }

  remove(id: number) {
    return `This action removes a #${id} limit`;
  }
}
