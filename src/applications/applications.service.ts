import { BadRequestException, forwardRef, HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { In, Like, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Application } from './entities/application.entity';
import { GetApplicationDto } from './dto/get-application.dto';
import security from 'src/utils/security';
import { RolesCodeEnum, RolesIdEnum } from 'src/common/constants';
import * as pMap from 'p-map';
import { WorkflowsService } from 'src/workflows/workflows.service';
import { Collaborator } from 'src/users/entities/collaborator.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { gt } from 'lodash';
import { UserFavoriteApplication } from './entities/userFavoriteApplication';
import { NoticeType } from 'src/common/constants/types';
import { UsersService } from 'src/users/users.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable({
  scope: Scope.REQUEST
})
export class ApplicationsService {
  constructor(
    @Inject(REQUEST)
    private request: Request,
    @InjectRepository(Application)
    private ApplicationsRepository: Repository<Application>,
    @InjectRepository(Collaborator)
    private CollaboratorsRepository: Repository<Collaborator>,
    @InjectRepository(UserFavoriteApplication)
    private UserFavoriteApplicationsRepository: Repository<UserFavoriteApplication>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private workflowsService: WorkflowsService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService
  ) { }

  async createApplicaiton(createApplicationDto: CreateApplicationDto) {
    const { user: currentUser }: any = this.request
    const result = await this.ApplicationsRepository.manager.transaction(async (manager) => {
      const application = new Application()
      application.appId = security.numericToken(6)
      application.icon = createApplicationDto.icon
      application.name = createApplicationDto.name
      application.description = createApplicationDto.description
      await manager.save(application)

      const collaborator = new Collaborator()
      collaborator.appId = application.id
      collaborator.userId = currentUser.userId
      collaborator.roles = RolesCodeEnum.Owner
      collaborator.roleId = RolesIdEnum.Owner
      await manager.save(collaborator)

      // ?????????????????????
      await this.workflowsService.createWorkflow({
        appId: application.id,
        manager
      })

      return application
    }).catch((error: Error) => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    return result
  }


  async getApplications(getApplicationDto: GetApplicationDto) {
    const {
      active,
    } = getApplicationDto
    const { user: currentUser }: any = this.request

    // ???????????????????????????????????????????????????app (????????????app)
    const collaboratorsInfo = await this.CollaboratorsRepository.findBy({
      userId: currentUser.userId
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    const appIds =
      collaboratorsInfo &&
      collaboratorsInfo.length > 0 &&
      Array.from(new Set(collaboratorsInfo.map(app => app.appId)));

    if (active === 'mine') {
      // ??????????????????+????????????app
      return this.getMineApplication(getApplicationDto, appIds)
    } else {
      // ????????????app
      return this.getAllApplication(getApplicationDto, appIds)
    }
  }

  async getMineApplication(getApplicationDto: GetApplicationDto, appIds: number[]) {
    const {
      pageSize,
      current,
      query = ''
    } = getApplicationDto
    // ???appId?????????application??????????????????  ?????????????????????
    // TODO: ??????????????????
    const appList = await this.ApplicationsRepository.find({
      where: {
        id: In(appIds),
        name: Like(`%${query}%`)
      },
      order: {
        createdAt: 'DESC'
      },
      take: Number(pageSize),
      skip: Number(pageSize) * (Number(current) - 1)
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    const appInfoList = await pMap(appList, async (appInfo: any) => {
      // TODO: ???????????? + ????????????
      const {
        id,
        name,
        description,
        icon,
        createdAt,
        appId
      } = appInfo;

      return {
        id,
        name,
        createdAt,
        hasPermission: true,
        description,
        icon,
        appId,
        liked: false
      };
    });

    return {
      list: appInfoList || [],
      total: appList.length || 0
    };
  }

  async getAllApplication(getApplicationDto: GetApplicationDto, appIds: number[]) {
    const {
      pageSize,
      current,
      query
    } = getApplicationDto

    const appList = await this.ApplicationsRepository.find({
      where: {
        id: MoreThan(0),
        name: Like(`%${query}%`)
      },
      order: {
        createdAt: 'DESC'
      },
      take: Number(pageSize),
      skip: Number(pageSize) * (Number(current) - 1)
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    const appInfoList = await pMap(appList, async (appInfo: any) => {
      // ?????????
      // TODO: ?????????????????????app??????
      // TODO: ????????????
      if (!(appIds || []).includes(appInfo.id)) {
        const {
          id,
          name,
          description,
          icon,
          createdAt,
          type,
        } = appInfo;

        return {
          type,
          id,
          name,
          createdAt,
          hasPermission: false,
          description,
          icon,
          liked: false
        };
      }

      const {
        id,
        name,
        description,
        icon,
        createdAt,
        appId
      } = appInfo;

      return {
        id,
        name,
        createdAt,
        hasPermission: true,
        description,
        icon,
        appId,
        liked: false
      };
    });

    return {
      list: appInfoList || [],
      total: appList.length || 0
    };
  }

  async getApplication(id: number) {
    return await this.ApplicationsRepository
      .createQueryBuilder('application')
      .where('application.id = :id', {
        id
      })
      .getOne().catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
  }


    /**
   * ????????????????????????
   * @param appId
   */
     async getAppInfo(appId: number) {
      const res = await this.getApplication(appId);
  
      if (!res) {
        return;
      }
  
      const {
        id,
        name,
        description,
        appId: key,
      } = res;
  
  
      return {
        id,
        name,
        description,
        appId: key,
      };
    }

  async updateApplication(params: UpdateApplicationDto) {
    const res = await this.ApplicationsRepository.update({ id: params.id }, params).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    });
    return res
  }

    /** ???????????????????????? */
    async requestJoinApplication(appId: number): Promise<any> {
      const res = await this.notificationsService.doNotify(
        appId,
        NoticeType.REQ_APP
      );
      if (res === 0) {
        // ????????????????????????
        const users = await this.usersService.getCollaborators({
          appId,
          roles: "Owner",
          pageSize: 5,
          current: 1
        });
        return {
          data: {
            result: false,
            users: users.list.map(({ id, userName }) => ({ id, userName })) // ??????owner??????
          }
        };
      }
      return {
        data: {
          result: true
        }
      };
    }

  async addFavoriteApplication(query: { collectId: number }) {
    const { collectId } = query;
    const { user: currentUser }: any = this.request

    return this.UserFavoriteApplicationsRepository.insert({
      userId: currentUser.userId,
      collectId
    });
  }

  
  async deleteFavoriteApplication(query: { collectId: number }) {
    const { collectId } = query;
    const { user: currentUser }: any = this.request

    return this.UserFavoriteApplicationsRepository.delete({
      userId: currentUser.userId,
      collectId
    });
  }

  async getApplicationsFromFavorite() {
    const { user: currentUser }: any = this.request
    const res = await this.UserFavoriteApplicationsRepository.find({
      where: {
        userId: currentUser.userId
      }
    });
    if (res) {
      return res.map(item => item.collectId);
    }
    return [];
  }
}
