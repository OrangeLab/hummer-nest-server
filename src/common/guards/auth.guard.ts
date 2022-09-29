import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private UsersRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const noAuth = this.reflector.get<boolean>('noAuth', context.getHandler());
    if(noAuth) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    // 获取token
    const accessToken = request.cookies['hummer-nest-token']
    if(!accessToken) {
      return false
    }
    const user = await this.UsersRepository.createQueryBuilder("user")
      .where("user.accessToken = :accessToken", { accessToken })
      .getOne().catch(() => {
        return false
      })

    if (!user) {
      return false
    }

    request.user = user

    return true

    //TODO： 鉴权逻辑 eg. checkToken

  }
}