import * as fsExtra from 'fs-extra';

interface BaseConfig {
  version: string;
  appId: number;
  appKey: number;
  mode: string;
  isMandatory: number;
  modules: object[];
  description: string;
}

const moduleTypes = {
  minVersion: "min_version",
  lazyDownload: "lazy_download",
  isMandatory: "is_mandatory",
  lazyLoad: "lazy_load"
};

/**
 * 生成标准化配置
 * @param config
 * @param extraConfig 自定义额外的基础config
 * @param extraModuleConfig 自定义额外的模块config
 */
export const generateConfig = (
  config: BaseConfig,
  extraConfig = {},
  extraModuleConfig = []
) => {
  const { version, appKey, mode, isMandatory, description } = config;
  const baseConfig = {
    app_id: "",
    version: "",
    config_version: "1.0.3",
    platform: "",
    native_version: "",
    mode: "",
    is_mandatory: 0,
    channel: "",
    description: "",
    // min_version: '',
    modules: [
      {
        module_id: "",
        module_name: "",
        version: "",
        route: "",
        md5: "",
        key: "",
        flag: ""
        // min_version: '',
        // lazy_download: 0,
        // is_mandatory: 0,
        // lazy_load: 0,
      }
    ]
  };
  const configModules = config.modules.map((item: any) => {
    const {
      moduleId,
      route,
      md5: itemMd5,
      key = "",
      filename = "",
      name,
      version: itemVersion,
      flag
      // minVersion,
      // lazyDownload,
      // isMandatory,
      // lazyLoad,
    } = item;

    const mExtra = (extraModuleConfig || []).reduce((res: any, itemKey) => {
      if (item[itemKey]) {
        // moduleTypes
        res[moduleTypes[itemKey]] = item[itemKey];
      }

      return res;
    }, {});
    return {
      module_id: moduleId,
      module_name: name,
      route,
      md5: itemMd5,
      key: key || filename,
      version: itemVersion,
      flag: flag || "",
      ...mExtra
      // min_version: minVersion,
      // lazy_download: lazyDownload || 0,
      // is_mandatory: mIsMandatory || 0,
      // lazy_load: lazyLoad || 0,
    };
  });

  return Object.assign(baseConfig, {
    app_id: appKey,
    version,
    mode,
    is_mandatory: isMandatory,
    modules: configModules,
    description: description || "",
    ...extraConfig
  });
}

/**
 *
 * @param content
 * @param url
 */
 export const generateJsonFile = async (content, url) => {
  return new Promise((resolve, reject) => {
    // 把data对象转换为json格式字符串
    const responseJSON = {
      code: 200,
      data: {
        ...content
      }
    };
    const fileContent = JSON.stringify(responseJSON);
    // 写入文件
    fsExtra.writeFile(url, fileContent, function(err) {
      if (err) {
        reject(err);
      }
      resolve(true);
    });
  });
};