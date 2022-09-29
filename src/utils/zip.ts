/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable func-names */
import * as fs from "fs";
import * as archiver from "archiver";
import * as path from "path";
import * as unzip from "unzipper";

/**
 * 针对单独Module打包zip包
 * @param params
 * origin 源文件路径/文件
 * outputDir 输出的文件夹
 * filename 压缩包Name
 */
export const zipSingleModule = params => {
  const { origin, outputDir, zipName: fileName } = params;
  const zipName = `${fileName}.zip`;
  const output = path.join(outputDir, zipName);
  const zipArchiver = archiver("zip");
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const fileInfo = fs.statSync(origin) || {};

    zipArchiver.pipe(fs.createWriteStream(output));
    archiver("zip", {
      zlib: { level: 9 }
    });

    zipArchiver.on("error", function(err) {
      reject(err);
    });
    zipArchiver.on("close", function() {
      resolve(zipName);
    });
    zipArchiver.on("end", function() {
      resolve(zipName);
    });

    if ((fileInfo as fs.Stats).isDirectory && (fileInfo as fs.Stats).isDirectory()) {
      zipArchiver.directory(origin, "./");
    } else {
      zipArchiver.file(origin, { name: path.basename(origin) });
    }
    zipArchiver.finalize();
  });
};

export const unzipModule = params => {
  const { origin, outputPath } = params;
  if (!fs.existsSync(origin)) {
    throw new Error("文件不存在");
  }
  return new Promise((resolve, reject) => {
    fs.createReadStream(origin)
      .pipe(unzip.Extract({ path: outputPath }))
      .on("close", function() {
        resolve(origin);
      });
  });
};
