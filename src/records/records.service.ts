import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
//@ts-ignore
import * as semverCompare from "semver-compare";
import { Record } from './entities/record.entity';
import { GetRecordDto } from './dto/get-record.dto';
import { flattenDeep, isEmpty } from 'lodash'
import { DeployEnvType, DeployStatus, NoticeType, PlatformEnum, RecordLinkTypes, RecordState, StatePath, WorkflowActionEnum, WorkflowNodeCommonComment, WorkflowNodeId } from 'src/common/constants/types';
import { transformPlatforms } from 'src/utils';
import { RecordVersion } from './entities/record-version.entity';
import { ModuleVersion } from 'src/modules/entities/module-version.entity';
import { RecordModuleVersion } from './entities/record-module-version.entity';
import { ApplicationsService } from 'src/applications/applications.service';
import { DeploysService } from 'src/deploys/deploys.service';
import { NativeVersion } from 'src/native-versions/entities/native-version.entity';
import { RecordWorkflowStatus } from 'src/workflows/entities/record-workflow-status.entity';
import { formatRecordRow } from 'src/utils/workflow';
import * as HPack from "src/utils/hpack";
import { getAllFlows, getLinkDefaultState, initState, mapStateToStatus } from 'src/common/constants/workflow';
import { WorkflowsService } from 'src/workflows/workflows.service';
import { Workflow } from 'src/workflows/entities/workflow.entity';
import { Module } from 'src/modules/entities/module.entity';
import { LimitRecordVersion } from 'src/limits/entities/limit-record-version.entity';
import { LimitConfig } from 'src/common/constants';


@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Record)
    private RecordsRepository: Repository<Record>,
    @InjectRepository(RecordVersion)
    private RecordVersionsRepository: Repository<RecordVersion>,
    @InjectRepository(Module)
    private ModulesRepository: Repository<Module>,
    @InjectRepository(ModuleVersion)
    private ModuleVersionsRepository: Repository<ModuleVersion>,
    @InjectRepository(RecordModuleVersion)
    private RecordModuleVersionsRepository: Repository<RecordModuleVersion>,
    @InjectRepository(NativeVersion)
    private NativeVersionsRepository: Repository<NativeVersion>,
    @InjectRepository(RecordWorkflowStatus)
    private RecordWorkflowStatusesRepository: Repository<RecordWorkflowStatus>,
    @Inject(forwardRef(() => ApplicationsService))
    private applicationService: ApplicationsService,
    @Inject(forwardRef(() => DeploysService))
    private deployService: DeploysService,
    private workflowService: WorkflowsService
  ) { }

  // 应用的发布(审批流程)流程 前进一步 
  async flowForward(params: CreateRecordDto, user: any) {
    let { appId, action, recordId } = params;
    const { platform = "", config } = params;
    const { workflowService, deployService } = this;

    let stateJson = initState;
    if (recordId) {
      const recordInfo = await this.findOne(recordId);
      appId = recordInfo.appId;
      // @ts-ignore
      stateJson = await workflowService.getRecordState({ recordId });
    }

    const { nodeId } = stateJson;
    const { workflow } = await workflowService.getAppWorkflow(
      {
        appId,
        recordId
      },
      false
    );

    const linkIndex = workflow.findIndex(item => (item as any).nodeId === nodeId);
    const curLink: any = workflow[linkIndex];
    const nextLink: any =
      linkIndex + 1 < workflow.length ? workflow[linkIndex + 1] : null;
    const allFlows = getAllFlows(curLink, workflow);

    let snapshot = {
      nodeInfo: { nodeId }
    };
    const updateState = (
      flowState: any,
      noticeType?: NoticeType
    ): Promise<any> => {
      const otherInfo: { [key: string]: any } = {};
      if (noticeType) {
        otherInfo.noticeType = noticeType;
        if (
          [NoticeType.PUBLISH_FAIL, NoticeType.PUBLISH_SUCCESS].includes(
            noticeType
          )
        ) {
          otherInfo.nodeType =
            (curLink as any).subType === DeployEnvType.DEV
              ? DeployEnvType.DEV
              : DeployEnvType.PROD;
        }
        // TODO: 通知服务
        // notifyService.recordChangeNotify(recordId, otherInfo);
      }
      return this.updateWorkflowState(recordId, flowState);
    };
    let res = null;
    let publishOnline = false;
    if ((curLink as any).type === RecordLinkTypes.NEW) {
      action = WorkflowActionEnum.CREATE;
      if (recordId) {
        await updateState(allFlows[StatePath.DOING]);
      }
      try {
        res = await this.createDepolyRecord(params, user);
        recordId = res;
        await workflowService.setRecordWorkflow({
          appId,
          recordId: res
        });
        snapshot = Object.assign(snapshot, this.getRecordSnapshot(params));
      } catch (error) {
        if (recordId) {
          await updateState(allFlows[StatePath.FAIL]);
        }
        throw error;
      }
      await this.updateWorkflowState(recordId, allFlows[StatePath.SUCCESS]);
    } else if (curLink.type === RecordLinkTypes.PUBLISH) {
      const { subType } = curLink;
      // await updateState(allFlows[StatePath.DOING]);
      if (subType === "dev") {
        // 测试环境发布
        try {
          res = await deployService.publish(
            recordId,
            "stable",
            // @ts-ignore
            platform,
            config
          );
        } catch (error) {
          await updateState(allFlows[StatePath.FAIL], NoticeType.PUBLISH_FAIL);
          throw error;
        }
        await updateState(
          allFlows[StatePath.SUCCESS],
          NoticeType.PUBLISH_SUCCESS
        );
      } else if (subType === "prod") {
        // 正式环境发布
        if (nextLink) {
          await updateState(allFlows[StatePath.SUCCESS]);
        } else {
          publishOnline = true;
        }
      }
    } else if (curLink.type === RecordLinkTypes.APPLY) {
      if (action === WorkflowActionEnum.DONE) {
        await updateState(allFlows[StatePath.SUCCESS], NoticeType.APPROVE_WAIT);
      }
    } else if (curLink.type === RecordLinkTypes.APPROVE) {
      if (action === WorkflowActionEnum.REJECT) {
        //
        await updateState(
          allFlows[StatePath.REJECT],
          NoticeType.APPROVE_REJECT
        );
      } else {
        await updateState(allFlows[StatePath.SUCCESS], NoticeType.APPROVE_PASS);
      }
    } else if (
      curLink.type === RecordLinkTypes.RESULT &&
      [WorkflowActionEnum.PUBLISH_ONLINE, WorkflowActionEnum.DONE].includes(
        action
      )
    ) {
      publishOnline = true;
    }

    if (
      nextLink?.type === RecordLinkTypes.RESULT &&
      action !== WorkflowActionEnum.REJECT
    ) {
      const hasProdLink = workflow.some(
        // @ts-ignore
        item => item.type === RecordLinkTypes.PUBLISH && item.subType === "prod"
      );
      if (hasProdLink) {
        // 线上发布的操作统一归并到 完成发布节点 异步执行 不阻塞当前流程
        this.flowForward({
          ...params,
          action: WorkflowActionEnum.DONE,
        }, user);
      }
    }

    if (publishOnline) {
      // 最后发布线上节点
      await updateState(allFlows[StatePath.DOING]);
      try {
        // @ts-ignore

        res = await deployService.publish(recordId, "", platform, config);
      } catch (error) {
        updateState(allFlows[StatePath.FAIL], NoticeType.PUBLISH_FAIL);
        const errorMsg = error && ('2003' || JSON.stringify(error));
        // TODO: 操作日志
        // this.addOperationLog({
        //   appId,
        //   recordId,
        //   action,
        //   remark: {
        //     ...snapshot,
        //     errorMsg
        //   }
        // }); // 记录操作日志
        throw error;
      }
      await updateState(
        allFlows[StatePath.SUCCESS],
        NoticeType.PUBLISH_SUCCESS
      );
    }
    // TODO: 操作日志
    // this.addOperationLog({ appId, recordId, action, remark: snapshot }); // 记录操作日志
    return res;
  }

  getRecordSnapshot(params): any {
    const { description, modules = [] } = params;
    const snapshot = {
      description,
      modules: HPack.hpack(
        modules.map(item => ({
          moduleId: item.moduleId,
          versionId: item.versionId
        }))
      )
    };
    return snapshot;
  }

  updateWorkflowState(recordId: number, flowState: any): Promise<any> {
    const { nodeType, nodeId, nodeStatus, link } = flowState;
    const { workflowService } = this;
    const state = { nodeType, nodeId, nodeStatus };
    const oldStatus = mapStateToStatus(state, link);
    const promises = [
      workflowService.updateWorkflowState({
        recordId,
        workflow: state
      })
    ];
    if (oldStatus) {
      // 设置records表里的status

      promises.push(
        this.RecordsRepository.createQueryBuilder()
          .update(Record)
          .set({ status: oldStatus })
          .where("id = :recordId", { recordId })
          .execute()
      );
    }
    return Promise.all(promises);
  }

  // 创建发布单
  async createDepolyRecord(params: CreateRecordDto, user: { userId: string, userName: string }) {
    // 创建记录
    const recordId = await this.createRecord(params, user);
    // 构建发布单
    await this.buildRecord(recordId, params);

    return recordId;
  }

  async createRecord(createRecordDto: CreateRecordDto, user: { userId: string, userName: string }) {
    const {
      appId,
      version,
      description,
      type,
      mode = 1,
      isMandatory = 0,
      platforms,
      androidVersions = [],
      iosVersions = [],
      modules
    } = createRecordDto;
    const platform = transformPlatforms(platforms);

    const record = await this.RecordsRepository.createQueryBuilder()
      .insert()
      .into(Record)
      .values({
        appId,
        version,
        description,
        type: Number(type),
        mode: Number(mode),
        platform,
        isMandatory,
        creator: user.userName,
        creatorId: +user.userId,
        operator: user.userName,
        operatorId: +user.userId
      })
      .execute()
      .catch(error => {
        throw new HttpException('2003', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const recordId = record.generatedMaps[0].id

    // 插入关联版本表
    const androidRcordVersions = (androidVersions || []).map(item => {
      return {
        recordId,
        versionId: item,
        platform: PlatformEnum.Android
      };
    });
    const iOSRecordVersions = (iosVersions || []).map(item => {
      return {
        recordId,
        versionId: item,
        platform: PlatformEnum.Ios
      };
    });
    const record_versions = [
      ...(androidRcordVersions || []),
      ...(iOSRecordVersions || [])
    ];

    await this.RecordVersionsRepository.createQueryBuilder()
      .insert()
      .into(RecordVersion)
      .values(record_versions)
      .execute()
      .catch((error) => {
        throw new HttpException('2003', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    // 插入关联模块表
    const versionIds = modules.map(module => module.versionId);
    const modulesObj = {};

    const moduleVersionsInfo = await this.ModuleVersionsRepository
      .createQueryBuilder('moduleVersion')
      .where('moduleVersion.id IN (:...versionIds)', { versionIds })
      .getMany()
      .catch(error => {
        throw new HttpException('2001', HttpStatus.INTERNAL_SERVER_ERROR)
      })


    moduleVersionsInfo.forEach(m => {
      modulesObj[m.id] = m;
    });
    const record_module_versions = [...modules].map(item => {
      return {
        recordId,
        moduleId: item.moduleId,
        versionId: +item.versionId,
        version: modulesObj[item.versionId]?.version
      };
    });

    // 记录模块信息
    await this.RecordModuleVersionsRepository.createQueryBuilder()
      .insert()
      .into(RecordModuleVersion)
      .values(record_module_versions)
      .execute()
      .catch((error) => {
        throw new HttpException('2001', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    return recordId;
  }

  // 更新发布记录
  async updateRecord(recordId: number, params: CreateRecordDto, user) {
    const { modules, description } = params;
    const { userId, userName } = user;
    // 更新应用
    const record = await this.findOne(recordId)
    const { version: recordVersion } = record;
    let { versionLabel } = record;
    versionLabel = `${(versionLabel ? Number(versionLabel) : 0) +
      Math.floor(Math.random() * 10) +
      1}`;
    // 编辑时新增副版本号
    const updateInfo = {
      description,
      status: DeployStatus.PackageReady,
      versionLabel: `${versionLabel}`,
      operator: userName,
      operatorId: userId,
      updatedAt: new Date()
    };
    Object.entries(updateInfo).forEach(([key, value]) => {
      record[key] = value;
    });
    await this.RecordsRepository.createQueryBuilder()
      .update(Record)
      .set(record)
      .where("id = :recordId", { recordId })
      .execute()
      .catch(error => {
        throw new HttpException('2001', HttpStatus.INTERNAL_SERVER_ERROR)
      });
    //  插入关联模块表
    const versionIds = modules.map(module => module.versionId);
    // 模块版本信息
    const versionObj = {};
    const moduleVersionInfos = await this.ModuleVersionsRepository
      .createQueryBuilder('moduleVersion')
      .where('moduleVersion.id IN (:...ids)', { ids: versionIds })
      .getMany()
      .catch(error => {
        throw new HttpException('5', HttpStatus.INTERNAL_SERVER_ERROR)
      });

    moduleVersionInfos.forEach(m => {
      versionObj[m.id] = m;
    });
    const recordModules = [...modules]
      .filter(item => !!versionObj[item.versionId]?.version)
      .map(item => {
        return {
          recordId,
          moduleId: item.moduleId,
          versionId: item.versionId,
          version: versionObj[item.versionId]?.version
        };
      });

    await this.RecordModuleVersionsRepository.createQueryBuilder()
      .delete()
      .from(RecordModuleVersion)
      .where("recordId = :recordId", { recordId })
      .execute()
      .catch(error => {
        throw new HttpException('6', HttpStatus.INTERNAL_SERVER_ERROR)
      });

    await this.RecordModuleVersionsRepository.createQueryBuilder()
      .insert()
      .into(RecordModuleVersion)
      //@ts-ignore
      .values(recordModules)
      .execute()
      .catch(error => {
        throw new HttpException('7', HttpStatus.INTERNAL_SERVER_ERROR)
      });


    const version = `${recordVersion}_${versionLabel}`; // 拼接副版本号

    return version;
  }

  async updateDepolyRecord(recordId: number, params: CreateRecordDto, user: any): Promise<any> {
    try {
      const version = await this.updateRecord(recordId, params, user); // 编辑日志
      const res = await this.buildRecord(recordId, {
        ...params,
        version
      });
      const logInfo = {
        appId: params.appId,
        recordId,
        action: WorkflowActionEnum.MODIFY,
        remark: {
          ...this.getRecordSnapshot(params),
          version,
          nodeInfo: {
            nodeId: WorkflowNodeId.PUBLISH_DEV
          }
        }
      };
      // TODO: 操作日志
      // await this.addOperationLog(logInfo);
      const {
        workflow
      } = await this.workflowService.getAppWorkflow(logInfo, false);
      const devPubLink = workflow.find((item: any) => item.subType === "dev");
      if (devPubLink) {
        // 编辑后回退到「测试环境待发布」
        const state = getLinkDefaultState(devPubLink);
        this.updateWorkflowState(recordId, { ...state, link: devPubLink });
      }
      return res;
    } catch (error) {
      throw new HttpException('8', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  // 根据模块id获取模块详细信息
  async getModuleDetails(modules: Array<any>) {
    const modulesDetail: Array<object> = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const item of modules) {
      const moduleVersion = await this.ModuleVersionsRepository
        .createQueryBuilder('moduleVersion')
        .where('moduleVersion.id = :id', { id: item.versionId })
        .getOne()
        .catch(error => {
          throw new HttpException('9', HttpStatus.INTERNAL_SERVER_ERROR)
        })
      const module = await this.ModulesRepository
        .createQueryBuilder('module')
        .where('module.id = :id', { id: item.moduleId })
        .getOne()
        .catch(error => {
          throw new HttpException('10', HttpStatus.INTERNAL_SERVER_ERROR)
        })
      modulesDetail.push({ ...module, ...moduleVersion });
    }
    return modulesDetail;
  }

  async buildRecord(recordId: number, createRecordDto: CreateRecordDto) {
    const {
      appId,
      modules,
      androidVersions,
      iosVersions,
      description = ""
    } = createRecordDto;


    const appDetail = await this.applicationService.getAppInfo(appId);
    const moduleDetails = await this.getModuleDetails(modules);
    const deployConfig = {
      id: recordId,
      ...createRecordDto,
      channel: `${appDetail}-assets`,
      // androidVersionDetails,
      // iosVersionDetails,
      modules: moduleDetails,
      description,
      appKey: null
    };
    // 更新状态 => 打包中
    // await this.updateRecordStatus(recordId);
    // 去打包 => 生成配置 => 存库
    // 打包抽离后，这一步进行只进行配置的同步和数据的存储
    deployConfig.appKey = appDetail.appId; // 自增app的id换成应用生成的appId

    await this.deployService.deploy({
      ...deployConfig,
      // extraConfig,
      extraModuleConfig: [
        "minVersion",
        "lazyDownload",
        "isMandatory",
        "lazyLoad"
      ]
    });

    return recordId;
  }

  async getRecordList(getRecordDto: GetRecordDto, user: { userId: string, userName: string }) {
    const {
      current,
      pageSize,
      appId,
      status,
      type,
      env
    } = getRecordDto
    let {
      platform,
    } = getRecordDto
    platform = platform
      ? platform.concat(PlatformEnum.All)
      : [PlatformEnum.All, PlatformEnum.Android, PlatformEnum.Ios];

    const isProdEnv = env === DeployEnvType.PROD;

    let recordsBuilder = this.RecordsRepository
      .createQueryBuilder('record')
      .where('record.appId = :appId', { appId })
      .andWhere('record.is_deleted = 0')
      .andWhere(platform !== undefined ? 'record.platform IN (:...platforms)' : {}, { platforms: flattenDeep([platform]) })
      .andWhere(status !== undefined ? 'record.status IN (:...statuses)' : {}, { statuses: flattenDeep([status]) })
      .andWhere(status !== undefined ? 'record.type IN (:...types)' : {}, { types: flattenDeep([type]) })
      // 左联workflow表
      .leftJoinAndMapOne('record.recordWorkflowStatus', RecordWorkflowStatus, 'recordWorkflowStatus', 'record.id = recordWorkflowStatus.recordId')


    if (isProdEnv) {
      recordsBuilder = recordsBuilder.andWhere('recordWorkflowStatus.nodeId IN (:...workflowNodeIds)', {
        workflowNodeIds: [
          WorkflowNodeId.RESULT,
          WorkflowNodeId.PUBLISH_ONLINE
        ]
      })
        .andWhere('recordWorkflowStatus.nodeStatus = :nodeStatus', {
          nodeStatus: RecordState.SUCCESS
        })
    } else {
      recordsBuilder = recordsBuilder.andWhere('recordWorkflowStatus.nodeId NOT IN (:...workflowNodeIds)', {
        workflowNodeIds: [
          WorkflowNodeId.RESULT,
          WorkflowNodeId.PUBLISH_ONLINE
        ]
      })
        .orWhere('recordWorkflowStatus.nodeStatus != :nodeStatus', {
          nodeStatus: RecordState.SUCCESS
        })
    }



    const records = await recordsBuilder.orderBy('record.created_at', 'DESC').limit(Number(pageSize)).offset(Number(pageSize) * (Number(current) - 1))
      .getMany().catch(error => {
        throw new HttpException('11', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const formatedRecords = formatRecordRow(records, +user.userId)
    return {
      list: formatedRecords,
      total: formatedRecords.length
    }
  }

  async getNewestVersion(appId: number) {
    const records = await this.RecordsRepository.createQueryBuilder('record')
      .where('record.appId = :appId', {
        appId
      })
      .getMany()
      .catch(error => {
        throw new HttpException('12', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const versions = records
      .sort((a, b) => semverCompare(b.version, a.version))
      .map(item => item.version);

    let version = versions[0];

    if (!version) {
      version = "0.0.1";
    } else if (/^([\d]+\.)+\d+$/.test(version)) {
      version = version.replace(
        /(\.\d+)$/g,
        value => `.${Number(value.replace(".", "")) + 1}`
      );
    }
    return version;
  }

  // 检查当前应用的native版本中是否有相同发布单
  async checkVersion(params: any) {
    const { appId, version, androidVersions = [], iosVersions = [] } = params;
    const records = await this.RecordsRepository.createQueryBuilder('record')
      .where('record.appId = :appId', { appId })
      .andWhere('record.version = :version', { version })
      .getMany()
      .catch(error => {
        throw new HttpException('13', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    // 没找到发布单 直接return
    if (isEmpty(records)) {
      return [];
    }

    const recordIds = (records || []).map(r => r.id);
    const versionIds = androidVersions.concat(iosVersions);

    const recordVersions = await this.RecordVersionsRepository.createQueryBuilder('recordVersion')
      .where(versionIds.length ? 'recordVersion.versionId IN (:...versionIds)' : {}, { versionIds })
      .andWhere(recordIds.length ? 'recordVersion.recordId IN (:...recordIds)' : {}, { recordIds })
      .getMany()
      .catch(error => {
        throw new HttpException('14', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    if (isEmpty(recordVersions)) {
      return [];
    }

    const res = await this.NativeVersionsRepository.createQueryBuilder('nativeVersion')
      .where('nativeVersion.id IN (:...ids)', { ids: recordVersions.map(d => d.versionId) })
      .getMany()
      .catch(error => {
        throw new HttpException('15', HttpStatus.INTERNAL_SERVER_ERROR)
      })


    const info = res.map(r => ({
      platform: r.platform,
      version: r.version
    }));
    return info;
  }

  /**
   * 发布完成，更新应用的稳定版本(线上版)
   * @param recordId 记录Id
   */
  async markStableVersion(recordId: number) {
    let recordVersionsBuiler = this.RecordVersionsRepository.createQueryBuilder('recordVersion')
      .where('recordVersion.recordId = :recordId', { recordId });


    // 左联NativeVersion
    const recordVersions = await recordVersionsBuiler.leftJoinAndMapOne('recordVersion.nativeVersion', NativeVersion, 'nativeVersion', 'nativeVersion.id = recordVersion.versionId')
      .getMany()
      .catch(error => {
        throw new HttpException('2001', HttpStatus.INTERNAL_SERVER_ERROR)
      })

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

    try {
      const promises: Array<Promise<any>> = [];
      versions.forEach(item => {
        const { id, versionId } = item;
        promises.push(this.markNativeStable(id, versionId));
      });
      await Promise.all(promises);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
 * 更新
 * @param version
 */
  private async markNativeStable(id: number, versionId: number) {

    await this.NativeVersionsRepository.createQueryBuilder()
      .update(NativeVersion)
      .set({
        stableVersionId: id
      })
      .where("id = :id", { id: versionId })
      .execute()
      .catch(error => {
        throw new HttpException('2000', HttpStatus.INTERNAL_SERVER_ERROR)
      })

  }

  async findOne(id: number) {
    return await this.RecordsRepository
      .createQueryBuilder('record')
      .where('record.id = :id', {
        id
      })
      .getOne().catch(error => {
        throw new HttpException('2005', HttpStatus.INTERNAL_SERVER_ERROR)
      })
  }

  // 获取记录详情
  async getRecordDetail(recordId: number) {
    const nativeInfos = await this.RecordVersionsRepository
      .createQueryBuilder('recordVersion')
      .where('recordVersion.recordId = :recordId', { recordId })
      .getMany()
      .catch(error => {
        throw new HttpException('2005', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const ids = nativeInfos.map(info => info.versionId);
    const nativeVersions = await this.getRecordNativeVersions(ids);
    // 查询发布单关联的应用版本信息
    const androidVersions: Array<number> = [];
    const androidVersionIds: Array<number> = [];
    const iosVersions: Array<number> = [];
    const iosVersionIds: Array<number> = [];
    nativeVersions
      .filter(info => info.platform === PlatformEnum.Android)
      .forEach(info => {
        androidVersions.push(info.version);
        androidVersionIds.push(info.id);
      });
    nativeVersions
      .filter(info => info.platform === PlatformEnum.Ios)
      .forEach(info => {
        iosVersions.push(info.version);
        iosVersionIds.push(info.id);
      });

    // 查询发布单关联的模块信息
    const recordModuleInfos = await this.RecordModuleVersionsRepository
      .createQueryBuilder('recordModuleVersion')
      .where('recordModuleVersion.recordId = :recordId', { recordId })
      .getMany()
      .catch(error => {
        throw new HttpException('2006', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const mids = recordModuleInfos.map(info => info.moduleId);

    const moduleDetailInfos = await this.ModulesRepository
      .createQueryBuilder('module')
      .where('module.id IN (:...mids)', { mids })
      .getMany()
      .catch(error => {
        throw new HttpException('2007', HttpStatus.INTERNAL_SERVER_ERROR)
      })



    // 模块名字
    const moduleDetail = moduleDetailInfos.reduce((info, item) => {
      info[item.id] = {
        name: item.name,
        description: item.description
      };
      return info;
    }, {});

    // 发布单中模块信息
    const modules = await Promise.all(
      recordModuleInfos.map(async info => {
        const versionInfo = await this.ModuleVersionsRepository
          .createQueryBuilder('moduleVersion')
          .where('moduleVersion.id = :versionId', { versionId: info.versionId })
          .getOne()
          .catch(error => {
            throw new HttpException('2008', HttpStatus.INTERNAL_SERVER_ERROR)
          })
        return {
          version: info.version,
          name: moduleDetail[info.moduleId]?.name,
          description: moduleDetail[info.moduleId]?.description,
          moduleId: info.moduleId,
          versionId: info.versionId,
          versionDescription: versionInfo?.description
        };
      })
    );

    // 发布单详情
    const recordInfo = await this.RecordsRepository
      .createQueryBuilder('record')
      .where('record.id = :id', { id: recordId })
      .leftJoinAndMapOne('record.recordWorkflowStatus', RecordWorkflowStatus, 'recordWorkflowStatus', 'recordWorkflowStatus.recordId = record.id')
      .getOne()
      .catch(error => {
        throw new HttpException('2003', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const {
      createdAt,
      creator,
      description,
      id,
      isMandatory,
      mode,
      operator,
      platform,
      status,
      type,
      updatedAt,
      version,
      // @ts-ignore
      recordWorkflowStatus
    } = recordInfo;

    const { nodeId, nodeType, nodeStatus } = recordWorkflowStatus || {};
    const nodeComment =
      nodeType && WorkflowNodeCommonComment[nodeType][nodeStatus];

    return {
      createdAt,
      creator,
      description,
      id,
      isMandatory,
      mode,
      operator,
      platform,
      status,
      type,
      updatedAt,
      version,
      androidVersions,
      iosVersions,
      androidVersionIds,
      iosVersionIds,
      modules,
      nodeId,
      nodeType,
      nodeStatus,
      nodeComment
    };
  }

  // 获取native版本详情
  async getRecordNativeVersions(verionIds: Array<number> = []) {
    let promises: Array<Promise<any>> = [];
    promises = verionIds.map(id => {
      return this.NativeVersionsRepository.createQueryBuilder('nativeVersion')
        .where('nativeVersion.id = :id', { id })
        .getOne()
        .catch(error => {
          throw new HttpException('2003', HttpStatus.INTERNAL_SERVER_ERROR)
        })
    });
    return Promise.all(promises);
  }

  // 获取单个发布单的native版本信息（整合灰度相关信息）
  async getRecordNativeVersionsDetail(params: {recordId: number}) {
    const { recordId } = params

    const recordInfo = await this.RecordsRepository
      .createQueryBuilder('record')
      .where('record.id = :id', { id: recordId })
      .getOne()
      .catch(error => {
        throw new HttpException('11111111', HttpStatus.INTERNAL_SERVER_ERROR)
      })

    const RecordVersions = await this.RecordVersionsRepository
      .createQueryBuilder('recordVersion')
      .where('recordVersion.recordId = :recordId', { recordId })
      // 左联nativeVersion
      .leftJoinAndMapOne('recordVersion.NativeVersion', NativeVersion, 'nativeVersion', 'recordVersion.versionId = nativeVersion.id')
      // 左联灰度表
      .leftJoinAndMapOne('recordVersion.LimitRecordVersion', LimitRecordVersion, 'limitRecordVersion', 'recordVersion.id = LimitRecordVersion.recordVersionId')
      .getMany()
      .catch(error => {
        throw new HttpException('2222222', HttpStatus.INTERNAL_SERVER_ERROR)
      })


      console.log(RecordVersions)

    // 相同应用版本里, 正式环境发布成功且[未全量/已经停止灰度]的记录 (已排序, DESC)
    // 多个时取先创建的发布单
    const limitSortInfo = await this.parseLimitInfo({
      recordVersionIds: RecordVersions.map(info => info.versionId),
      recordVersion: recordInfo.version
    });

    // 处理发布单中每个版本信息
    const res = RecordVersions.map(recordVersion => {
      const limitGroupInfo = recordVersion.LimitRecordVersion;
      const native = recordVersion.NativeVersion;
      const { id, configPath } = recordVersion;
      const {
        platform,
        description,
        version,
        operator,
        createdAt,
        updatedAt
      } = native as NativeVersion;
      let limitInfo = (limitSortInfo as any)[(native as NativeVersion).id] || [];
      if (limitInfo && limitInfo.length > 0) {
        limitInfo = limitInfo[limitInfo.length - 1];
      }

      return {
        id,
        recordId,
        native: {
          platform,
          description,
          version,
          operator,
          createdAt,
          updatedAt
        },
        limitId: native.limitId, // native版本有开关
        limit: {
          percent: limitGroupInfo?.percent,
          device: limitGroupInfo?.device,
          city: limitGroupInfo?.city,
          operator: limitGroupInfo?.operator,
          createdAt: limitGroupInfo?.createdAt,
          updatedAt: limitGroupInfo?.updatedAt,
          id: limitGroupInfo?.id
        },
        status: limitGroupInfo?.status || LimitConfig.init,
        configPath,
        hasLimit: !!native.limitId && id === limitInfo?.id, // native版本有开关, 且相同应用版本以及发布单版本里, 先创建的发布单版本可灰度
        latestLimitVersion: limitInfo["Record.version"], // 最近的未完成灰度历史发布单
        hasDownload: !!configPath, // 已经测试环境发布或者正式环境发布后的包才可以打本地包
        terminated: limitGroupInfo?.status === LimitConfig.terminated
        // hasRollBack: , // 是否可回滚
      };
    });

    return res;
  }

  update(id: number, updateRecordDto: UpdateRecordDto) {
    return `This action updates a #${id} record`;
  }

  remove(id: number) {
    return `This action removes a #${id} record`;
  }

    /**
   * 相同应用版本, 正式环境发布成功且[未全量/已经停止灰度/提前结束灰度]的记录 (已排序, DESC)
   * @param params
   */
     async parseLimitInfo(params: any) {
      const {
        recordVersionIds,
        recordVersion // 当前发布单版本
      } = params;
  
      const resList = await Promise.all(
        recordVersionIds.map(async recordVersionId => {
          const sameVersionIdInfo = await this.RecordVersionsRepository.createQueryBuilder('recordVersion')
            .where('recordVersion.id = :recordVersionId', { recordVersionId })
            // 左联LimitRecordVersion
            .leftJoinAndMapOne('recordVersion.LimitRecordVersion', LimitRecordVersion, 'limitRecordVersion', 'recordVersion.id = limitRecordVersion.recordVersionId')
            .leftJoinAndMapOne('recordVersion.Record', Record, 'record', 'recordVersion.recordId = record.id')
            .getMany()
            .catch(error => {
              throw new HttpException('3', HttpStatus.INTERNAL_SERVER_ERROR)
            })

          // 相同发布单版本中, 已发布线上且未全量/已经停止灰度
          const infos = sameVersionIdInfo.filter(info => {
            return (
              //  === info["Record.version"] &&
              info.Record?.status === DeployStatus.PublishDone &&
              info.LimitRecordVersion?.status !== LimitConfig.done &&
              info.LimitRecordVersion?.status !== LimitConfig.stop && // 未全量/已经停止灰度
              info.LimitRecordVersion?.status !== LimitConfig.terminated
            );
          });

          const data = infos.sort((a, b) =>
            semverCompare(b["Record.version"], a["Record.version"])
          );
  
          return {
            [recordVersionId]: data
          };
        })
      );
  
      const res = (resList || []).reduce((obj, item) => {
        Object.assign(obj, item);
        return obj;
      }, {});
  
      return res;
    }
}
