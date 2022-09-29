interface toggleParams {
  description?: string;
  name: string;
  version?: string;
  namespaces?: [];
  config?: string;
  percent: number;
}

interface GroupParams {
  appId?: number;
  name: string; // toggle name
  config: string;
  groupName: string; // 发布单version
  percent?: number;
  phone?: string;
  city?: string;
  rules?: any;
}
// 新建/编辑开关——数据结构
export const parseLimitData = (params: toggleParams) => {
  const { name, config = "", namespaces, description = "", percent } = params;

  const baseGroup = parseBaseGroupData({
    percent,
    params: [
      {
        key: "config",
        value: config || ""
      },
      {
        key: "description", // 发布单中的版本描述（同步到开关中对外展示）
        value: "" // 仅初始化就好
      }
    ]
  });
  const toggleData = {
    toggleInfo: {
      name,
      description: name,
      versionDescription: description
    },
    rules: [
      [
        {
          key: "bucket",
          value: [[0, 1000]],
          operator: "="
        }
      ]
    ],
    groups: [baseGroup]
  };

  return toggleData;
}

// 基础组——数据结构
export const parseBaseGroupData = (data: { percent: number, params: any[] }) => {
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

export const transformGroupName = (groupName: string): string => {
  if (groupName === "control_group") return groupName;
  const items = groupName.split("_");
  if (items.length === 3) {
    return items.slice(1).join("_");
  }
  return groupName;
}