import * as fs from "fs";
import * as crypto from "crypto";

/**
 * 计算Md5值
 * @param path
 */
export const md5 = function(path: string) {
  const md5sum = crypto.createHash("md5");
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const md5Value = crypto
        .createHash("md5")
        .update((data as unknown) as string, "utf8")
        .digest("hex");
      resolve(md5Value);
    });
  });
};
