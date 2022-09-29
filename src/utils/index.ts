import * as fs from "fs-extra";
import fetch from "node-fetch";
import { RequestOptions, curl } from "urllib";
import { PlatformEnum, PlatformMap } from "src/common/constants/types";


export * from './security';

export const checkAndCreateDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.ensureDirSync(dir);
  }
};

export const downloadFile = async (
  uri: any,
  fileName: fs.PathLike,
  validate = { mime: "", message: "" }
):Promise<string> => {
  return fetch(uri).then(
    async res => {
      const mime = res.headers.get("content-type");
      if (validate.mime) {
        if (!mime.includes(validate.mime)) {
          throw new Error(validate.message);
        }
      }
      const stream = fs.createWriteStream(fileName);
      res.body.pipe(stream);

      return new Promise((resolve, reject) => {
        stream.on("finish", () => resolve(mime));
        stream.on("error", reject);
      });
    },
    e => {
      throw e;
    }
  );
};

export const transformPlatforms = (platforms: Array<string>): number => {
  if (
    platforms.indexOf(PlatformMap.Android) > -1 &&
    platforms.indexOf(PlatformMap.Ios) > -1
  ) {
    return PlatformEnum.All;
  }
  if (platforms.indexOf(PlatformMap.Android) > -1) {
    return PlatformEnum.Android;
  }
  if (platforms.indexOf(PlatformMap.Ios) > -1) {
    return PlatformEnum.Ios;
  }
  return PlatformEnum.All;
};

export const getPlatform = (platform: number): string => {
  const platformMap = {
    1: "android",
    2: "ios"
  };
  return platformMap[platform];
};

export const sendRequest = async(
  url: string,
  params: RequestOptions
) => {
  // TODO: 端口配置化
  const data = await curl<any>('http://localhost:7383' + url, {
    dataType: "json",
    contentType: "json",
    timeout: 8000,
    ...params
  })
  .then(res => {
    return res?.data;
  })
  .catch(err => {

  });

  return data;
}