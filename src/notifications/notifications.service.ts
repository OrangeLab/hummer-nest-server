import { forwardRef, Inject, Injectable, Scope } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { getHtmlFromContent, getMsgFromRecordInfo, getSiteUrl, OriginMessage, sendMail } from 'src/utils/notify';
import { DeployEnvType, NoticeType, PlatformEnum } from 'src/common/constants/types';
import { User } from 'src/users/entities/user.entity';
import { Record } from 'src/records/entities/record.entity';
import { Application } from 'src/applications/entities/application.entity';
import { RecordsService } from 'src/records/records.service';
import { getNameByCityId } from 'src/utils/city';

interface NotifyParamsInterface {
  newUserId: string;
  nodeId: number;
  workflowId: number;
  type: DeployEnvType;
  recordId: number;
  device: string;
  city: string;
  percent: number;
  limitName: string;
  nativeInfo: {
    platform: number;
    version: string;
  };
  description: string;
}

type NotifyParams = Partial<NotifyParamsInterface>;


@Injectable({
  scope: Scope.REQUEST
})
export class NotificationsService {
  domain = getSiteUrl();
  notifyConfig: any;
  recordLink: string;
  recordInfo: any;
  recordInfoMsg: any;
  noticeType: NoticeType;
  appLink: string;
  appId: number;
  appInfo: {
    name: string;
    appId: number;
  };
  constructor(
    @Inject(REQUEST)
    private request: Request,
    @InjectRepository(Notification)
    private NotificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private UsersRepository: Repository<User>,
    @InjectRepository(Record)
    private RecordsRepository: Repository<Record>,
    @InjectRepository(Application)
    private ApplicationsRepository: Repository<Application>,
    @Inject(forwardRef(() => RecordsService))
    private recordsService: RecordsService
  ){ }

    /**
   * 根据类型分发通知
   */
     async doNotify(
      appId: number,
      noticeType: NoticeType,
      params?: NotifyParams
    ): Promise<any> {
      const appInfo = await this.ApplicationsRepository.findOneBy({id: appId});
      this.notifyConfig = await this.getNotifyConfig({appId: `${appId}`});

      // 如果没配置则跳过通知操作
      if (!this.notifyConfig) {
        return 0; // 特殊返回值
      }
      this.appId = appId;
      this.appInfo = appInfo;
      this.appLink = `${this.domain}/publish/app/records/?appId=${appId}`;
      this.noticeType = noticeType;
      const map = {
        [NoticeType.REQ_APP]: {
          fn: this.reqJoinAppNotify
        },
        [NoticeType.JOIN_APP]: {
          fn: this.joinedAppNotify
        },
        [NoticeType.APPROVE_WAIT]: {
          fn: this.waitApproveNotify
        },
        [NoticeType.APPROVE_PASS]: {
          fn: this.approvePassNotify
        },
        [NoticeType.APPROVE_REJECT]: {
          fn: this.approveRejectNotify
        },
        [NoticeType.PUBLISH_SUCCESS]: {
          fn: this.publishNotify
        },
        [NoticeType.PUBLISH_FAIL]: {
          fn: this.publishFailNotify
        },
        [NoticeType.UPDATE_LIMIT]: {
          fn: this.apolloUpdateNotify
        },
        [NoticeType.FULL_LIMIT]: {
          fn: this.apolloUpdateNotify
        }
      };
      const { fn } = map[noticeType];
      console.log('33333')

      const execFn = fn.bind(this);
      return execFn(params);
    }

      /**
   * 发布单相关类型通知
   */
  async recordChangeNotify(recordId: number, otherInfo: any): Promise<any> {
    if (!otherInfo) return;
    const { nodeType, noticeType } = otherInfo;
    const { appId } = await this.RecordsRepository.findOneBy({id: recordId});
    this.recordLink = `${this.domain}/publish/app/records/deploy/?appId=${appId}&recordId=${recordId}`;
    this.recordInfo = await this.recordsService.getRecordDetail(
      recordId
    );
    this.recordInfoMsg = getMsgFromRecordInfo(this.recordInfo);
    this.doNotify(appId, noticeType, { type: nodeType });
  }

  async reqJoinAppNotify(): Promise<any> {
    const { user: { userName } }: any = this.request
    const link = `${this.domain}/publish/app/collaborator/?appId=${this.appId}`;
    return this.sendMessage({
      title: `申请应用权限`,
      fields: [
        { label: "应用", value: `[${this.appInfo.name}](${link})` },
        { label: "申请人", value:  userName }
      ],
      linkName: "前去增加成员",
      link
    });
  }

  async joinedAppNotify(params: NotifyParams): Promise<any> {
    const { newUserId } = params;
    
    const user = await this.UsersRepository.findOne({
      where: {
        userId: newUserId
      }
    });
    return this.sendMessage({
      title: "新加入成员",
      fields: [
        { label: "应用", value: this.appInfo.name },
        { label: "新同学", value: user.userName }
      ]
    });
  }

  async waitApproveNotify(): Promise<any> {
    const { user: { userName } }: any = this.request

    return this.sendMessage({
      title: `发布单待审批`,
      fields: [
        { label: "应用", value: `[${this.appInfo.name}](${this.recordLink})` },
        { label: "发起人", value: userName },
        ...this.recordInfoMsg
      ],
      link: this.recordLink
    });
  }

  // 审批通过通知
  async approvePassNotify(): Promise<any> {
    const { user: { userName } }: any = this.request

    return this.sendMessage({
      title: "发布单审批通过",
      fields: [
        { label: "应用", value: `[${this.appInfo.name}](${this.recordLink})` },
        { label: "审批人", value: userName },
        ...this.recordInfoMsg
      ],
      link: this.recordLink
    });
  }

  // 审批驳回通知
  async approveRejectNotify(): Promise<any> {
    const { user: { userName } }: any = this.request

    return this.sendMessage({
      title: "发布单审批驳回",
      fields: [
        { label: "应用", value: `[${this.appInfo.name}](${this.recordLink})` },
        { label: "执行人", value: userName },
        ...this.recordInfoMsg
      ],
      link: this.recordLink
    });
  }

  async publishNotify(params: NotifyParams): Promise<any> {
    const { user: { userName } }: any = this.request

    const { type } = params;
    return this.sendMessage({
      title: `发布到${type === DeployEnvType.DEV ? "测试" : "正式"}环境`,
      fields: [
        { label: "应用", value: `[${this.appInfo.name}](${this.recordLink})` },
        { label: "执行人", value: userName},
        ...this.recordInfoMsg
      ],
      link: this.recordLink
    });
  }

  async publishFailNotify(params: NotifyParams): Promise<any> {
    const { type } = params;
    const { user: { userName } }: any = this.request

    return this.sendMessage({
      title: `发布到${type === DeployEnvType.DEV ? "测试" : "正式"}环境失败`,
      fields: [
        { label: "应用", value: `[${this.appInfo.name}](${this.recordLink})` },
        { label: "执行人", value: userName },
        ...this.recordInfoMsg
      ],
      link: this.recordLink
    });
  }

  async apolloUpdateNotify(params: NotifyParams): Promise<any> {
    const {
      nativeInfo,
      recordId,
      description = "",
      city = "",
      device = "",
      percent = 0
    } = params;
    const { user: { userName } }: any = this.request

    const { platform = PlatformEnum.Android, version = "" } = nativeInfo || {};
    const platformName = ["Unknown", "Android", "iOS"][platform];
    const cityNames: string[] = getNameByCityId(city);
    const title =
      this.noticeType === NoticeType.FULL_LIMIT
        ? "灰度配置已全量发布"
        : "灰度配置更新";
    const link = `${this.domain}/publish/app/records/deploy/?appId=${this.appId}&recordId=${recordId}`;
    return this.sendMessage({
      title,
      fields: [
        { label: "应用", value: `[${this.appInfo.name}](${link})` },
        { label: "执行人", value: userName },
        { label: "端平台", value: platformName },
        { label: "端版本", value: version },
        { label: "设备唯一id", value: device },
        { label: "城市", value: cityNames.join(",") },
        { label: "流量", value: `${percent}%` },
        { label: "发布描述", value: description }
      ],
      link
    });
  }

    /**
   * 发送消息dc方式&邮件
   */
  async sendMessage(content: OriginMessage): Promise<void> {
  const { emails } = this.notifyConfig;
  if (emails) {
    const toEmails: string[] = [];
    emails.forEach(item => {
      const { nodes, toEmails: vEmails } = item;
      if (nodes.includes(this.noticeType)) {
        toEmails.push(...vEmails);
      }
    });
    if (toEmails.length) {
      sendMail(toEmails, {
        html: getHtmlFromContent(content),
        subject: `【HummerNest】${content.title}`
      });
    }
  }
}

  async setNotifyConfig(createNotificationDto: CreateNotificationDto) {
    const { appId, emails } = createNotificationDto;
    const res = await this.NotificationsRepository.findOne({
      where: { appId }
    });
    if (res) {
      return await this.NotificationsRepository.update({
          appId
        },
        {
          emails
        }
      );
    }
    return await this.NotificationsRepository.insert({
      appId,
      emails
    });
  }

  async getNotifyConfig(query: { appId: string }) {
    const { appId } = query;
    const row = await this.NotificationsRepository.findOne({
      where: { appId: +appId}
    });
    const { emails } = row || {};
    return {
      appId,
      emails: emails || []
    };
  }

}

