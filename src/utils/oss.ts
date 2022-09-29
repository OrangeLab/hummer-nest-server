import * as OSS from 'ali-oss'
import * as path from 'path';
import config from 'src/config';

const ossConfig = config.ossConfig || {
  // yourregion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
  region: 'YourRegion',
  // 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户。
  accessKeyId: 'AccessKeyId',
  accessKeySecret: 'AccessKeySecret',
  // 填写Bucket名称。关于Bucket名称命名规范的更多信息，请参见Bucket。
  bucket: 'YourBucket',
}

const client = new OSS(ossConfig);

/**
 * 上传到OSS
 */
export async function uploadLocalFileToRemote({
  filename,
  localPath
}) {
  // 获取私有写地址
  const headers = {
    // 指定该Object被下载时网页的缓存行为。
    'Cache-Control': 'no-cache', 
    // 指定该Object被下载时的名称。
    'Content-Disposition': filename, 
    // 指定该Object被下载时的内容编码格式。
    'Content-Encoding': 'UTF-8', 
    // 指定过期时间。
    // 'Expires': 'Wed, 08 Jul 2022 16:57:01 GMT', 
    // 指定Object的存储类型。
    'x-oss-storage-class': 'Standard', 
    // 指定Object的访问权限。
    'x-oss-object-acl': 'private', 
    // 设置Object的标签，可同时设置多个标签。
    // 'x-oss-tagging': 'Tag1=1&Tag2=2', 
    // 指定CopyObject操作时是否覆盖同名目标Object。此处设置为false，表示可以覆盖同名Object。
    'x-oss-forbid-overwrite': 'false',
  }
  const result = await client.put(filename, path.normalize(localPath), { headers });
  return result
}

/**
 * 获取有时效的公有读地址 1800s
 * @param urls 
 * @returns
 */
export function getPublicUrls(urls:string[]) {
  return urls.map(url => {
    return client.signatureUrl(url)
  })
}
