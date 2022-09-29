import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity'
import { HttpService } from '@nestjs/axios';
import { Privilege } from './entities/privilege.entity';
import { RolePrivilege } from './entities/rolePrivilege.entity';
import { Collaborator } from 'src/users/entities/collaborator.entity';
import { RolesCodeEnum, RolesIdEnum } from 'src/common/constants';
import { Application } from 'src/applications/entities/application.entity';
import { isEmpty, reduce } from 'lodash';
import { GetUsersDto } from './dto/get-users.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { UserRole } from './entities/userRole.entity';
import { NoticeType } from 'src/common/constants/types';
import { NotificationsService } from 'src/notifications/notifications.service';
import config from 'src/config';

@Injectable({
  scope: Scope.REQUEST
})
export class UsersService {
  constructor(
    @Inject(REQUEST)
    private request: Request,
    @InjectRepository(User)
    private UsersRepository: Repository<User>,
    @InjectRepository(Application)
    private ApplicationsRepository: Repository<Application>,
    @InjectRepository(Privilege)
    private privilegesRepository: Repository<Privilege>,
    @InjectRepository(RolePrivilege)
    private RolePrivilegesRepository: Repository<RolePrivilege>,
    @InjectRepository(Collaborator)
    private CollaboratorsRepository: Repository<Collaborator>,
    @InjectRepository(UserRole)
    private UserRolesRepository: Repository<UserRole>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private readonly httpService: HttpService
  ) { }

  async authCallbackHandler(query: { code: string}) {
    const tokenInfo = await this.getTokenInfo(query.code)
    const accessToken = tokenInfo.data.access_token
    const userInfo = await this.getUserInfo(accessToken)
    // 创建用户
    const user = await this.findOne(userInfo.data.id)
    const { name: userName, id: userId, avatar_url: avatar} = userInfo.data
    if (!user) {
      this.create({
        userName,
        userId,
        avatar,
        accessToken
      })
    } else {
      this.update(userId, {
        userName,
        userId,
        avatar,
        accessToken
      })
    }

    return accessToken
  }

  async getTokenInfo(code: string): Promise<any> {
    // github code2token API
    // const url = `https://github.com/login/oauth/access_token`
    const { authConfig } = config
    // gitee code2token
    const url = `https://gitee.com/oauth/token?grant_type=authorization_code&code=${code}&client_id=${authConfig.clienId}&redirect_uri=http://localhost:5242/users/auth/callback`
    return await this.httpService.axiosRef.post(url,
      {
        client_secret: authConfig.clientSecret
      },
      {
        headers: {
          'Accept': 'application/json'
        }
      })
  }

  async getUserInfo(accessToken: string): Promise<any> {
    // github
    // return await this.httpService.axiosRef.get(`https://api.github.com/user`, {
    //   headers: {
    //     Accept: 'application/json',
    //     Authorization: `token ${accessToken}`
    //   }
    // })
    // gitee
    return await this.httpService.axiosRef.get(`https://gitee.com/api/v5/user?access_token=${accessToken}`, {
      headers: {
        Accept: 'application/json',
      }
    })
  }

  async create(createUserDto: CreateUserDto) {
    return await this.UsersRepository.createQueryBuilder()
      .insert()
      .into(User)
      .values(createUserDto)
      .execute()
  }

  async getPrivileges(appId: string, userId: string) {
    const allPrivileges = await this.privilegesRepository.createQueryBuilder('user')
      .select(['user.privilegeId', 'user.code'])
      .getMany()

    // TODO: 管理默认返回所有权限
    // if (isAdmin) {
    //   // 如果是系统管理员
    //   return allPrivileges.reduce((res, { code }) => {
    //     res[code] = true;
    //     return res;
    //   }, {});
    // }

    const guestRoleId = RolesIdEnum.Guest;
    const rights = {};
    let roleId: number;
    if (appId) {
      // 从协作者表获取当前用户roleId
      const collaborator = await this.CollaboratorsRepository.findOneBy(
        { userId, appId: +appId }
      ).catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
      roleId = (collaborator && collaborator.roleId) || guestRoleId;
    } else {
      roleId = guestRoleId;
    }

    // const allRolePrivis = await this.RolePrivilegesRepository.find({
    //   where: {
    //     roleId
    //   },
    //   select: ['privilegeId']
    // }).catch(error => {
    //   throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    // })

    const allRolePrivis = await this.RolePrivilegesRepository.createQueryBuilder('rolePrivilege')
      .where('rolePrivilege.roleId = roleId', { roleId })
      .select(['rolePrivilege.privilegeId'])
      .getMany()

    const rolePrivis = allRolePrivis.map(({ privilegeId }) => privilegeId);
    allPrivileges.forEach(({ privilegeId, code }) => {
      rights[code] = rolePrivis.includes(privilegeId);
    });
    return rights;
  }


  /**
   * 创建应用成员
   * @param params
   */
  async createCollaborator(params: CreateCollaboratorDto) {
    const { appId, email, role, roleId } = params;
    const { user: currentUser }: any = this.request

    // 校验登录者角色
    const accountInfo = await this.CollaboratorsRepository.findOne({
      where: {
        userId: currentUser.userId,
        appId
      }
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })

    if (accountInfo?.roles !== RolesCodeEnum.Owner) {
      // TODO: 系统管理员权限
      // const user = await this.UsersRepository.findOne({
      //   where: {
      //     userId: currentUser.userId,
      //   }
      // });
      throw new HttpException(`无权限`, HttpStatus.BAD_REQUEST)

    }

    const newUserInfo = await this.getAndCheckUserByMail({ email, userId: currentUser.userId });

    const newAccountInfo = await this.CollaboratorsRepository.findOne({
      where: {
        userId: newUserInfo.userId,
        appId
      }
    });
    if (!isEmpty(newAccountInfo)) {
      throw new HttpException(`用户${email}已是成员, 不要重复添加`, HttpStatus.BAD_REQUEST)
    }


    const res = await this.CollaboratorsRepository.insert({
      appId,
      userId: newUserInfo.userId,
      roles: role,
      roleId
    });

    // 通知
    await this.notificationsService.doNotify(appId, NoticeType.JOIN_APP, {
      newUserId: newUserInfo.userId
    });

    return res
  }


  /**
   * 更新应用成员
   * @param params
   */
  async updateCollaborator(params: UpdateCollaboratorDto) {
    const { role, appId, userId } = params;
    const { user: currentUser }: any = this.request
    const roleInfo = await this.CollaboratorsRepository.findOne({
      where: { userId: currentUser.userId }
    });

    if (roleInfo.roles !== RolesCodeEnum.Owner) {
      throw new HttpException(`无权限`, HttpStatus.BAD_REQUEST)
    }

    return this.CollaboratorsRepository.update(
      {
        userId,
        appId
      },
      {
        roles: role
      }
    );
  }

  /**
 * 删除用户
 */
  async deleteCollaborator(params: UpdateCollaboratorDto) {
    const { userId, appId} = params
    const { user: currentUser }: any = this.request

    const accountInfo = await this.CollaboratorsRepository.findOne({
      where: {
        userId: currentUser.userId
      }
    });

    if (accountInfo.roles !== RolesCodeEnum.Owner) {
      throw new HttpException(`无权限`, HttpStatus.BAD_REQUEST)
    }

    return this.CollaboratorsRepository.delete({
      userId,
      appId
    });
  }


  /**
* 获取应用下所有成员-分页
*/
  async getCollaborators(query: GetUsersDto) {
    const { appId, roles, pageSize = 20, current = 1 } = query;
    const { user: currentUser }: any = this.request

    const params: any = { appId: Number(appId) };
    if (roles) {
      params.roles = roles;
    }
    const collaborators = await this.CollaboratorsRepository.find({
      where: params
    });
    if (!(collaborators && collaborators.length > 0)) {
      return {
        list: [],
        total: 0
      };
    }
    const cObj = reduce(
      collaborators,
      (result: any, cur) => {
        result.uids = result.uids || [];
        result.uids.push(cur.userId);
        result[cur.userId] = cur;
        return result;
      },
      {}
    );

    const userInfo = await this.UsersRepository.find({
      where: {
        userId: In(cObj.uids)
      },
      take: Number(pageSize),
      skip: Number(pageSize) * (current - 1),
      order: {
        createdAt: 'DESC'
      }
    });

    const rows = userInfo.map(user => {
      if (isEmpty(cObj[user.userId])) {
        return;
      }

      const { userId, userName, email } = user;
      const { roles: role, createdAt, updatedAt } = cObj[user.userId];
      return {
        isCurrentAccount: currentUser.userId === userId,
        id: userId,
        userName,
        email,
        role,
        createdAt,
        updatedAt
      };
    });

    return {
      list: rows || [],
      total: userInfo.length || 0
    };
  }

  async findOne(userId: string) {
    return await this.UsersRepository.createQueryBuilder("user")
      .where("user.userId = :userId", { userId })
      .getOne()
  }

  async findByToken(accessToken: string) {
    return await this.UsersRepository.createQueryBuilder("user")
      .where("user.accessToken = :accessToken", { accessToken })
      .getOne()
  }

  async update(userId: number, updateUserDto: UpdateUserDto) {
    return await this.UsersRepository.update({ userId: `${userId}` }, updateUserDto)
      .catch(error => {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      })
  }

  async getUsersFromIdenties(userIds: number[]) {
    if (!(userIds && userIds.length)) {
      return [];
    }

    return await this.UsersRepository.find({
      where: {
        userId: In(userIds)
      },
      select: ['userId', 'userName']
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })
  }

  async getAndCheckUserByMail(params): Promise<any> {
    const { email } = params;
    const userInfo = await this.UsersRepository.findOne({
      where: {
        email
      }
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    });
    if (isEmpty(userInfo)) {
      throw new HttpException(`用户${email}无账号信息, 请联系对方先进行登录`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
    return userInfo;
  }

  /**
   * @desc 检查当前用户是否有app的协作权限
  */
  async verifyCollaboratorCan(appId: string | number, user: any): Promise<any> {
    console.log(appId)
    const appInfo = await this.ApplicationsRepository.findOneBy({
      id: Number(appId)
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    });

    if (isEmpty(appInfo)) {
      throw new HttpException(`应用不存在`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
    const data = await this.getCollaboratorInfo(Number(appId), user);
    if (isEmpty(data)) {
      throw new HttpException(`没有应用${appInfo?.name}的权限, 请联系管理员添加`, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return data
  }

  async getCollaboratorInfo(appId: number, user: any): Promise<Collaborator> {
    const data = await this.CollaboratorsRepository.findOneBy({
      userId: user.userId,
      appId: appId
    }).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    });
    return data;
  }

  async getRolesDictionary() {
    const roles = await this.UserRolesRepository.find();
    return roles;
  }

  /**
   * 查询应用中的用户角色
   */
  async getUserRoles(query: { appId: string; userId?: string; }): Promise<any> {
    const { appId } = query;
    let { userId} = query
    const { user: currentUser }: any = this.request

    userId = (userId && Number(userId)) || currentUser.userId;

    const roleInfo = await this.CollaboratorsRepository.findOne({
      where: {
        userId,
        appId: Number(appId)
      }
    });

    return (roleInfo && roleInfo.roles) || RolesCodeEnum.Guest;
  }
}
