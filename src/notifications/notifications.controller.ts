import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('/setNotifyConfig')
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.setNotifyConfig(createNotificationDto);
  }

  @Get('/getNotifyConfig')
  findAll(@Query() query: { appId: string }) {
    return this.notificationsService.getNotifyConfig(query);
  }
}
