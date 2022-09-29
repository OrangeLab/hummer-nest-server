import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from "fs-extra";

import { checkAndCreateDir, downloadFile } from 'src/utils';
import { CreateBuildDto } from './dto/create-build.dto';
import { UpdateBuildDto } from './dto/update-build.dto';
import { zipSingleModule } from 'src/utils/zip';
import { uploadLocalFileToRemote } from 'src/utils/oss';
import { md5 } from 'src/utils/md5';

@Injectable()
export class BuildsService {
  create(createBuildDto: CreateBuildDto) {
    return 'This action adds a new build';
  }

  async buildModule(params, needUpload = true, needCleanFile = true) {
    const {
      appId,  // 用于基于分支打包
      moduleId,
      distType,
      dist,
      distPath = "", // 用于基于分支打包
      repo = "", // 用于基于分支打包
      moduleName = "",
    } = params;
    const HOME_PATH = process.env.HOME_PATH;
    const distTemp = path.resolve(HOME_PATH, `module-${moduleId}`, `time-${Date.now()}`);
    checkAndCreateDir(distTemp);
    const filename = `${moduleName}-${Date.now()}`;
    const fullFileName = `${filename}.zip`;
    let distname = "";
    let mime = "";
    let originName = ""; // 用于压缩的源文件

    if (distType === "branch") {
      // TODO:  从仓库分支构建
    } else if (distType === "uri") {
      try {
        const extraName = path.extname(dist);
        if (!extraName) {
          throw new HttpException('请加上资源后缀', HttpStatus.BAD_REQUEST)
        }
        // 处理后缀后面有参数的情况
        const extra = (extraName || "").split("?");
        distname = extra && extra.length > 1 ? dist.split("?")[0] : dist;
        // zip文件进行改名; 非zip用原名, 压缩时会改名
        const name = extraName.includes("zip")
          ? fullFileName
          : path.basename(distname);
        originName = path.join(distTemp, name);
        // 类型
        mime = await downloadFile(dist, originName);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      }
    } else if (distType === "upload") {
      const { buffer , originalname } = dist;
      mime = dist.mimetype;
      distname = originalname;
      try {
        let name = originalname;
        // zip文件进行改名; 非zip用原名, 压缩时会改名
        if (mime && mime.includes("zip")) {
          name = `${filename}${path.extname(originalname)}`;
        }
        originName = path.join(distTemp, name);
        fs.writeFileSync(originName, buffer);
      } finally {
        if (needCleanFile) {

        }
      }
    }
    // 针对符合条件的资源进行压缩(分支/远端下载和本地上传的非zip资源)
    if (distType === "branch" || !(mime && mime.includes("zip"))) {
      await zipSingleModule({
        zipName: filename,
        outputDir: distTemp,
        origin: originName
      });
    }

    // 上传
    let md5Str: any = "";
    try {
      if (needUpload) {
        await uploadLocalFileToRemote({
          filename: fullFileName,
          localPath: path.join(distTemp, fullFileName),
        });
      }
      md5Str = await md5(path.join(distTemp, fullFileName));
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
    fs.removeSync(distTemp)
    // fs.removeSync(originName);
    return { filename: fullFileName, distname, md5: md5Str };
  }

  findAll() {
    return `This action returns all builds`;
  }

  findOne(id: number) {
    return `This action returns a #${id} build`;
  }

  update(id: number, updateBuildDto: UpdateBuildDto) {
    return `This action updates a #${id} build`;
  }

  remove(id: number) {
    return `This action removes a #${id} build`;
  }
}
