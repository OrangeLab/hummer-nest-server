import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Logger, Redirect, Response, Request, HttpCode, HttpStatus, HttpException, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 用于处理Oauth回调 可替换
  // TODO: 重定向地址配置化
  @Get('/auth/callback')
  @Redirect('http://localhost:8000')
  async authCallback(@Query() query: { code: string }, @Response() res: any) {

    const accessToken = this.usersService.authCallbackHandler(query)
    // TODO: 设置一个有效期用于重新授权
    res.cookie('hummer-nest-token', accessToken)
    return
  }

  // 获取当前用户信息
  @Get('/getCurrentUser')
  getCurrentUser(@Request() req: any) {
    // 接口经过auth guard  user信息会被挂在req上
    if (req.user) {
      return req.user
    } else {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }
  }

  // 获取当前用户 任意app的权限
  @Get('/getPrivileges')
  getPrivileges(@Param('appId') appId: string, @Request() req: any) {
    return this.usersService.getPrivileges(appId, req.user.userId)
  }

  @Get('/getCollaborators')
  getCollaborators(@Query() query: GetUsersDto) {
    return this.usersService.getCollaborators(query)
  }

  @Post('/createCollaborator')
  createCollaborator(@Body() params: CreateCollaboratorDto) {
    return this.usersService.createCollaborator(params)
  }

  @Post('/updateCollaborator')
  updateCollaborator(@Body() params: UpdateCollaboratorDto) {
    return this.usersService.updateCollaborator(params)
  }
  
  @Delete('/deleteCollaborator')
  deleteCollaborator(@Body() params: UpdateCollaboratorDto) {
    return this.usersService.deleteCollaborator(params)
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Get('/getRolesDictionary')
  getRolesDictionary() {
    return this.usersService.getRolesDictionary()
  }

  @Get('/getUserRoles')
  getUserRoles(@Query() query: { appId: string; userId?: string; }) {
    return this.usersService.getUserRoles(query)
  }
}
