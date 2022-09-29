import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, Injectable } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { GetApplicationDto } from './dto/get-application.dto';
import { UsersService } from 'src/users/users.service';

@Controller('applications')
@Injectable()
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly usersService: UsersService
  ) {}

  @Post('/createApplicaiton')
  createApplicaiton(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.createApplicaiton(createApplicationDto);
  }

  @Get('/getApplications')
  getApplications(@Query() getApplicationDto: GetApplicationDto) {
    return this.applicationsService.getApplications(getApplicationDto);
  }

  @Get('/getApplication')
  getApplication(@Query('id') id: string) {
    return this.applicationsService.getApplication(+id);
  }

  @Patch('/updateApplication')
  updateApplication(@Body() updateApplicationDto: UpdateApplicationDto) {
    return this.applicationsService.updateApplication(updateApplicationDto);
  }

  @Get('/requestJoinApplication')
  requestJoinApplication(@Query('id') id: string) {
    return this.applicationsService.requestJoinApplication(+id);
  }

  @Get('/addFavoriteApplication')
  addFavoriteApplication(@Query() query: { collectId: number }) {
    return this.applicationsService.addFavoriteApplication(query);
  }

  @Delete('/deleteFavoriteApplication')
  deleteFavoriteApplication(@Query() query: { collectId: number }) {
    return this.applicationsService.deleteFavoriteApplication(query);
  }
}
