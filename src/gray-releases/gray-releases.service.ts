import { Injectable } from '@nestjs/common';
import { getPlatform, sendRequest } from 'src/utils';
import { parseLimitData, transformGroupName } from 'src/utils/limit';
import { CreateGrayReleaseDto } from './dto/create-gray-release.dto';
import { UpdateGrayReleaseDto } from './dto/update-gray-release.dto';

/**
 * 主要用于调用远程的灰度发布服务
*/

interface RuleParams {
  key: string;
  value: Array<string>;
  operator: string;
}

interface ToggleGroupParams {
  groupName?: string;
  version?: string;
  rules: Array<Array<RuleParams>>;
  config: string;
}

interface WhiteList {
  description: string;
  key: string;
  value: string[];
}

interface ToggleRule {
  key: string;
  value: string | number | ToggleRule[][];
  operator: string;
}

interface ToggleGroupParam {
  key: string;
  value: string;
}

interface ToggleGroup {
  name: string;
  rule: ToggleRule;
  whiteList: WhiteList;
  params: ToggleGroupParam[];
}

interface UpdateGroupParams {
  appId?: number;
  toggleName: string;
  groupName: string;
  config: string;
  percent?: number;
  device?: string;
  city?: string;
  bothChange: boolean;
}

@Injectable()
export class GrayReleasesService {
  create(createGrayReleaseDto: CreateGrayReleaseDto) {
    return 'This action adds a new grayRelease';
  }

  async createToggle(params: CreateGrayReleaseDto) {
    const {
      appId,
      appKey,
      platform,
      description = "创建开关",
      version: nativeVersion = "",
      config,
      percent,
    } = params;
    const version = nativeVersion
      ? `_${nativeVersion.replace(/\./g, "_")}`
      : "";
    const name = `hummer_${appKey}_${getPlatform(platform)}${version}`;

    const data = parseLimitData({
      name,
      description,
      config,
      percent
    });

    // 存储开关信息
    const toggleInfo = { ...data, appId }
    for (const group of toggleInfo.groups) {
      group.name = transformGroupName(group.name);
    }
    const res = await sendRequest("/toggles", {
      method: "POST",
      data: toggleInfo
    });

    return {
      toggleId: res.data.toggleId,
      toggleName: res.data.toggleName,
      groupName: 'control_group'
    };
  }

  // 自定义组规则
  getRules(params: {
    device?: string;
    city?: string;
    percent?: number;
  }): Array<Array<RuleParams>> {
    const { percent = 0 } = params;
    const ruleKey = ["device", "city", "percent"];
    const res: Array<any> = [];
    ruleKey.forEach(key => {
      if (!params[key]) {
        return;
      }

      if (key === "percent") {
        res.push([
          {
            key: "bucket",
            value: [[0, percent * 10]],
            operator: "="
          }
        ]);
      } else {
        res.push([
          {
            key,
            value: params[key]?.split(","),
            operator: "="
          }
        ]);
      }
    });

    return res;
  }

  /**
 * 新建/编辑组——数据结构
 *
 * @param params
 */
  parseLimitSubGroupData(params: ToggleGroupParams) {
    const { groupName, config = "", rules: value } = params;

    const ruleParams = [
      {
        key: "config",
        value: config
      }
    ];
    const res: any = {
      name: groupName,
      rule: {
        key: "rule",
        value: value || [],
        operator: "="
      },
      params: ruleParams
    };

    return res;
  }


  // 基础组——数据结构
  parseBaseGroupData(data) {
    const { percent, params } = data;

    return {
      name: "control_group",
      rule: {
        key: "exp_bucket",
        value: [[0, percent]], // 百分比控制
        operator: "="
      },
      params
    };
  }



  // 创建组
  async createToggleGroup(
    toggleName: string,
    groupInfo: ToggleGroup
  ): Promise<void> {
    groupInfo.name = transformGroupName(groupInfo.name);
    await sendRequest(`/toggles/${toggleName}/groups`, {
      method: "POST",
      data: groupInfo
    });
  }

  async updateToggleGroup(
    toggleName: string,
    groupName: string,
    groupInfo: ToggleGroup
  ): Promise<void> {
    groupInfo.name = transformGroupName(groupInfo.name);
    await sendRequest(
      `/toggles/${toggleName}/groups/${transformGroupName(groupName)}`,
      { method: "PUT", data: groupInfo }
    );
  }


  findAll() {
    return `This action returns all grayReleases`;
  }

  findOne(id: number) {
    return `This action returns a #${id} grayRelease`;
  }

  update(id: number, updateGrayReleaseDto: UpdateGrayReleaseDto) {
    return `This action updates a #${id} grayRelease`;
  }

  remove(id: number) {
    return `This action removes a #${id} grayRelease`;
  }
}
