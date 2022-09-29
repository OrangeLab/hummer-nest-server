import { Module as NestModule } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { TypeOrmModule } from '@nestjs/typeorm'
import { ModuleVersion } from './entities/module-version.entity';
import { Module } from './entities/module.entity';
import { BuildsService } from 'src/builds/builds.service';



@NestModule({
  imports: [TypeOrmModule.forFeature([ModuleVersion, Module])],
  controllers: [ModulesController],
  providers: [ModulesService, BuildsService]
})
export class ModulesModule {}
