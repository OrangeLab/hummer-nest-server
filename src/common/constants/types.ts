/**
 * 平台侧枚举值
 */
export enum PlatformEnum {
  All = 0,
  Android = 1,
  Ios = 2
}
/**
 * 平台侧映射值
 */
export enum PlatformMap {
  Android = "android",
  Ios = "ios"
}

/**
 * 平台侧枚举值全小写版本
 */
export const PlatformMapV2 = {
  all: 0,
  ios: 1,
  android: 2
};

/**
 * 发布单状态
 */
export enum DeployStatus {
  Default = -1, // 默认值
  CreateSuccess = 10, // 发布单创建成功
  CreateFail = -10, // 发布单创建失败
  PackageReady = 20, // 待打包
  PackageDoing = 21, // 打包中
  PackageFail = -20, // 打包失败
  PublishDevReady = 30, // 测试环境待发布
  PublishDevDoing = 31, // 测试环境发布中
  PublishDevFail = -30, // 测试环境发布失败
  PublishReady = 40, // 线上环境待发布
  PublishDoing = 41, // 线上环境发布中
  PublishFail = -40, // 线上环境发布失败
  PublishDone = 50, // 发布成功
  HasRollback = 60, // 已回滚
  RollbackPublish = 61 // 回滚发布的版本
}

/**
 * 模块构建状态
 */
export enum BuildStatus {
  WaitPackage, // 0待打包
  Building, // 1 jenkins打包中
  Success,
  Failed,
  Packaging, // 4 jenkins打包成功, mait处理文件
  InQueue // 5 jenkins打包队列中
}

export enum WorkflowActionEnum {
  CREATE = "create", // 创建
  MODIFY = "modify", // 编辑
  PUBLISH_DEV = "publish_dev", // 发布测试
  PUBLISH_ONLINE = "publish_online", // 发布线上
  REJECT = "reject", // 审批驳回
  APPROVE = "approve", // 审批通过
  DONE = "done", // 完成
  LIMIT_CONTROL_ANDROID = "limit_control_android",
  LIMIT_CONTROL_IOS = "limit_control_ios",
  LIMIT_CONTROL = "limit_control",
  OTHER = "other"
}

// 一对一特别标识某个节点 现在固定如下几个节点，可扩展
export enum WorkflowNodeId {
  NEW = 1,
  PUBLISH_DEV = 2,
  PUBLISH_ONLINE = 3,
  RESULT = 4,
  APPLY_PUBLISH = 5, // 上线申请
  APPROVE_QA = 6, // qa审批
  APPROVE_OWNER = 7 // owner审批
}

export enum RecordTypes {
  Feature, // 0需求
  BugFix, // 1bugfix
  Test // 2测试
}

// 所有流程节点都固有的几个状态
export enum RecordState {
  DEFAULT = 0, // 初始态
  DOING = 1, // 进行态
  SUCCESS = 2, // 成功态
  FAIL = -1, // 失败态
  REJECT = -2 // 驳回态
}

// 抽象出五类节点主类型
export enum RecordLinkTypes {
  NEW = "new", // 新建
  PUBLISH = "publish", // 发布
  RESULT = "result", // 结果
  APPROVE = "approve", // 审批
  APPLY = "apply" // 申请
}

// 节点状态注释 适用于发布详情页使用 通过nodeType查找
export const WorkflowNodeCommonComment = {
  [RecordLinkTypes.NEW]: {
    [RecordState.DEFAULT]: "发布单待创建",
    [RecordState.DOING]: "发布单创建中",
    [RecordState.SUCCESS]: "创建成功",
    [RecordState.FAIL]: "创建失败",
    [RecordState.REJECT]: "驳回"
  },
  [RecordLinkTypes.PUBLISH]: {
    [RecordState.DEFAULT]: "待发布",
    [RecordState.DOING]: "发布中",
    [RecordState.SUCCESS]: "发布成功",
    [RecordState.FAIL]: "发布失败",
    [RecordState.REJECT]: "驳回"
  },
  [RecordLinkTypes.RESULT]: {
    [RecordState.DEFAULT]: "发布成功",
    [RecordState.DOING]: "发布中", // 重新发布的情况
    [RecordState.SUCCESS]: "发布成功", // 重新发布的情况
    [RecordState.FAIL]: "发布失败",
    [RecordState.REJECT]: "驳回" // 占位
  },
  [RecordLinkTypes.APPROVE]: {
    [RecordState.DEFAULT]: "待审批",
    [RecordState.DOING]: "审批中", // 占位
    [RecordState.SUCCESS]: "审批通过",
    [RecordState.FAIL]: "审批失败",
    [RecordState.REJECT]: "驳回"
  },
  [RecordLinkTypes.APPLY]: {
    [RecordState.DEFAULT]: "待申请",
    [RecordState.DOING]: "申请中", // 占位
    [RecordState.SUCCESS]: "已申请",
    [RecordState.FAIL]: "申请失败", // 占位
    [RecordState.REJECT]: "驳回"
  }
};

// 节点状态注释 适用于发布列表使用 通过nodeId查找
export const WorkflowNodeSpecificComment = {
  [WorkflowNodeId.NEW]: WorkflowNodeCommonComment[RecordLinkTypes.NEW],
  [WorkflowNodeId.PUBLISH_DEV]: {
    [RecordState.DEFAULT]: "测试环境待发布",
    [RecordState.DOING]: "测试环境发布中",
    [RecordState.SUCCESS]: "测试环境发布成功",
    [RecordState.FAIL]: "测试环境发布失败",
    [RecordState.REJECT]: "已驳回"
  },
  [WorkflowNodeId.PUBLISH_ONLINE]: {
    [RecordState.DEFAULT]: "正式环境待发布",
    [RecordState.DOING]: "正式环境发布中",
    [RecordState.SUCCESS]: "正式环境发布成功",
    [RecordState.FAIL]: "正式环境发布失败",
    [RecordState.REJECT]: "已驳回"
  },
  [WorkflowNodeId.RESULT]: WorkflowNodeCommonComment[RecordLinkTypes.RESULT],
  [WorkflowNodeId.APPLY_PUBLISH]: {
    [RecordState.DEFAULT]: "上线待申请",
    [RecordState.DOING]: "上线申请中", // 占位
    [RecordState.SUCCESS]: "上线已申请",
    [RecordState.FAIL]: "上线申请失败",
    [RecordState.REJECT]: "上线申请驳回"
  },
  [WorkflowNodeId.APPROVE_QA]: {
    [RecordState.DEFAULT]: "QA待审批",
    [RecordState.DOING]: "QA审批中", // 占位
    [RecordState.SUCCESS]: "QA审批通过",
    [RecordState.FAIL]: "QA审批失败",
    [RecordState.REJECT]: "发布驳回"
  },
  [WorkflowNodeId.APPROVE_OWNER]: {
    [RecordState.DEFAULT]: "Owner待审批",
    [RecordState.DOING]: "Owner审批中", // 占位
    [RecordState.SUCCESS]: "Owner审批通过",
    [RecordState.FAIL]: "Owner审批失败",
    [RecordState.REJECT]: "发布驳回"
  }
};

// 节点文案和类型 通过nodeId查找
export const WorkflowNodeLink = {
  [WorkflowNodeId.NEW]: {
    nodeId: WorkflowNodeId.NEW,
    name: "新建发布单",
    type: RecordLinkTypes.NEW
  },
  [WorkflowNodeId.PUBLISH_DEV]: {
    nodeId: WorkflowNodeId.PUBLISH_DEV,
    name: "测试环境发布",
    type: RecordLinkTypes.PUBLISH,
    subType: "dev"
  },
  [WorkflowNodeId.PUBLISH_ONLINE]: {
    nodeId: WorkflowNodeId.PUBLISH_ONLINE,
    name: "正式环境发布",
    type: RecordLinkTypes.PUBLISH,
    subType: "prod"
  },
  [WorkflowNodeId.RESULT]: {
    nodeId: WorkflowNodeId.RESULT,
    name: "发布结果",
    type: RecordLinkTypes.RESULT
  },
  [WorkflowNodeId.APPLY_PUBLISH]: {
    nodeId: WorkflowNodeId.APPLY_PUBLISH,
    name: "上线申请",
    type: RecordLinkTypes.APPLY,
    subType: "publish"
  },
  [WorkflowNodeId.APPROVE_QA]: {
    nodeId: WorkflowNodeId.APPROVE_QA,
    name: "QA审批",
    type: RecordLinkTypes.APPROVE,
    subType: "qa"
  },
  [WorkflowNodeId.APPROVE_OWNER]: {
    nodeId: WorkflowNodeId.APPROVE_OWNER,
    name: "Owner审批",
    type: RecordLinkTypes.APPROVE,
    subType: "owner"
  }
};

// 节点上的目标动作 和 状态机搭配使用
export enum StatePath {
  DOING = "doing",
  FAIL = "fail",
  SUCCESS = "success",
  REJECT = "reject"
}

// 收藏类型
export enum CollectType {
  APP = "app"
}

// 发布单环境类型
export enum DeployEnvType {
  DEV = "dev",
  PROD = "prod"
}

// 通知类型
export enum NoticeType {
  REQ_APP, // 请求应用权限
  JOIN_APP, // 成员已加入
  APPROVE_WAIT, // 等待审批
  APPROVE_PASS, // 审批通过
  APPROVE_REJECT, // 审批驳回
  PUBLISH_SUCCESS, // 发布成功
  PUBLISH_FAIL, // 发布失败
  UPDATE_LIMIT, // 流量更新
  FULL_LIMIT // 全量
}
