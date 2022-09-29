import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { getLinkNodes, getLinks } from 'src/utils/workflow';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Workflow } from './entities/workflow.entity';
import { CreateAuditorDto } from './dto/create-auditor.dto';
import { initState, initWorkflow } from 'src/common/constants/workflow';
import { flatten } from "lodash";
import { Auditor } from './entities/auditor.entity';
import { UsersService } from 'src/users/users.service';
import { RecordWorkflowStatus } from './entities/record-workflow-status.entity';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private WorkflowsRepository: Repository<Workflow>,
    @InjectRepository(Auditor)
    private AuditorsRepository: Repository<Auditor>,
    @InjectRepository(RecordWorkflowStatus)
    private RecordWorkflowStatusesRepository: Repository<RecordWorkflowStatus>,
    @Inject(forwardRef(() => UsersService))
    private userService: UsersService
  ) { }

  async createWorkflow(createWorkflowDto: CreateWorkflowDto) {
    const { 
      appId,
      workflow: workflowNodes = initWorkflow,
      auditors,
      manager = this.WorkflowsRepository.manager
    } = createWorkflowDto;
    const linkJson = getLinks(workflowNodes)
    const workflow = new Workflow()
    workflow.appId = appId
    workflow.linkJson = linkJson
    let result: any = null
    if (manager) {
      result = await manager.save(workflow)
    } else {
      result = await this.WorkflowsRepository.insert(workflow).catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
    }

    const workflowId = result.id
    await this.createAuditors({ appId, auditors, workflowId })
    return workflowId;
  }

  async createAuditors(createAuditorDto: CreateAuditorDto) {
    let {workflowId} = createAuditorDto;
    const { auditors, appId } = createAuditorDto;
    if (!auditors) return true;
    if (!workflowId) {
      const link = await this.getLastedWorkflow(appId);
      workflowId = link.id;
    }
    const nodeIds: number[] = [];
    let values = Object.keys(auditors).map(key => {
      const nodeId = Number(key);
      nodeIds.push(nodeId);
      return auditors[key].map(item => {
        return {
          appId,
          workflowId,
          nodeId,
          userId: item
        };
      });
    });
    values = flatten(values);

    await this.AuditorsRepository.delete({
      appId,
      workflowId,
      nodeId: In(nodeIds)
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    return await this.AuditorsRepository.manager.insert(Auditor, values).catch(error => {
      throw new HttpException('22222', HttpStatus.INTERNAL_SERVER_ERROR)
    })
  }

  // 获取审批人
  async getRecordAuditors(params: {appId: number, workflowId: number}) {
    const { appId, workflowId } = params;
    const auditors = await this.AuditorsRepository
      .createQueryBuilder('auditor')
      .where('auditor.appId = :appId', { appId })
      .andWhere('auditor.workflowId = :workflowId', { workflowId })
      .select(['auditor.userId', 'auditor.nodeId'])
      .getMany().catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
    
    const auditorsObj = {};
    auditors.forEach(auditor => {
      const { userId, nodeId } = auditor;
      if (!auditorsObj[nodeId]) {
        auditorsObj[nodeId] = new Set();
      }
      auditorsObj[nodeId].add(userId);
    });
    const nodeIds = Object.keys(auditorsObj);
    await Promise.all(
      nodeIds.map(key => this.userService.getUsersFromIdenties([...auditorsObj[key]]))
    ).then(res => {
      res.forEach((item, index) => {
        const key = nodeIds[index];
        auditorsObj[key] = item;
      });
    });
    return auditorsObj;
  }

  async getLastedWorkflow(appId: number) {
    return await this.WorkflowsRepository
      .createQueryBuilder('workflow')
      .where('workflow.appId = :appId', {
        appId
      })
      .orderBy('workflow.updatedAt', 'DESC')
      .getOne().catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
  }

  async getAppWorkflow(
    query: {appId: string | number, recordId: string | number},
    shouleGetAuditors: boolean = true,
    shouldGetUpdateTime: boolean = false
  ) {
    const { appId, recordId } = query;
    let link: object[] = [];
    let workflowId = null;
    if (recordId) {
      // TODO: 通过record 查询
      const res = await this.RecordWorkflowStatusesRepository
        .createQueryBuilder('recordWorkflowStatus')
        .where('recordWorkflowStatus.recordId = :recordId', {
          recordId
        })
        .leftJoinAndMapOne('recordWorkflowStatus.workflow', Workflow, 'workflow',  'recordWorkflowStatus.workflowId = workflow.id')
        .getOne().catch(error => {
          throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
        })

      // @ts-ignore
      const linkJson = res?.workflow.linkJson;
      link = JSON.parse(linkJson || "[]");
       // @ts-ignore
      workflowId = res?.workflow.id;
    } else if (appId) {
      // 否则取应用最新版本的workflow
      const lastedLink = await this.getLastedWorkflow(+appId);
      workflowId = lastedLink.id;
      link = JSON.parse((lastedLink && lastedLink.linkJson) || "[]");
    }

    link = getLinkNodes(link as any[]);

    if (shouldGetUpdateTime && recordId) {
      // TODO: 
      // const timeline = await this.getWorkflowTimeline({ recordId, link });
      // link = link.map((item: any) => ({
      //   ...item,
      //   updatedAt: timeline[item.nodeId]
      // }));
    }

    if (shouleGetAuditors) {
      const auditors = await this.getRecordAuditors({ appId: + appId, workflowId: +workflowId });
      return {
        workflow: link,
        auditors
      };
    }

    return {
      workflow: link
    };
  }

  async getRecordState(params: { recordId: number }) {
    const { recordId } = params;

    return await this.RecordWorkflowStatusesRepository
      .createQueryBuilder('RecordWorkflowStatus')
      .where('RecordWorkflowStatus.recordId = :recordId', {
        recordId
      })
      .select(['RecordWorkflowStatus.nodeId', 'RecordWorkflowStatus.nodeType', 'RecordWorkflowStatus.nodeStatus'])
      .getOne().catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
  }


  async updateWorkflowState(params: {workflow: any, recordId: number}): Promise<any> {
    const { workflow, recordId } = params;
    const { nodeType, nodeId, nodeStatus } = workflow;
    return await this.RecordWorkflowStatusesRepository.createQueryBuilder()
      .update(RecordWorkflowStatus)
      .set({
        nodeType,
        nodeId,
        nodeStatus
      })
      .where("recordId = :recordId", { recordId })
      .execute()
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      });
  }

  async setRecordWorkflow(params: {appId: number, recordId: number, workflow?: any}) {
    const { appId, recordId, workflow } = params;
    let { nodeType, nodeId, nodeStatus } = initState;
    if (workflow) {
      nodeType = workflow.nodeType;
      nodeId = workflow.nodeId;
      nodeStatus = workflow.nodeStatus;
    }
    const { id: workflowId } = await this.getLastedWorkflow(appId);

    return this.RecordWorkflowStatusesRepository.createQueryBuilder()
      .insert()
      .into(RecordWorkflowStatus)
      .values({
        recordId,
        workflowId,
        nodeType,
        nodeId,
        nodeStatus
      })
      .execute()
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      });
  }

  findAll() {
    return `This action returns all workflows`;
  }

  findOne(id: number) {
    return `This action returns a #${id} workflow`;
  }

  update(id: number, updateWorkflowDto: UpdateWorkflowDto) {
    return `This action updates a #${id} workflow`;
  }

  remove(id: number) {
    return `This action removes a #${id} workflow`;
  }
}
