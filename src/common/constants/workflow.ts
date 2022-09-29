import {
  RecordLinkTypes,
  RecordState,
  StatePath,
  DeployStatus,
  WorkflowNodeId,
  WorkflowActionEnum
} from "./types";

interface StateInterface {
  nodeId: number;
  nodeType: RecordLinkTypes;
  nodeStatus: RecordState;
}

// 状态机
export const WorkflowMachine = {
  [RecordLinkTypes.NEW]: {
    success: {
      next: {
        [RecordLinkTypes.PUBLISH]: RecordState.DEFAULT
      }
    },
    fail: {
      self: RecordState.FAIL
    },
    doing: {
      self: RecordState.DOING
    }
  },
  [RecordLinkTypes.PUBLISH]: {
    success: {
      next: {
        [RecordLinkTypes.PUBLISH]: RecordState.DEFAULT,
        [RecordLinkTypes.APPROVE]: RecordState.DEFAULT,
        [RecordLinkTypes.RESULT]: RecordState.DEFAULT
      }
    },
    fail: {
      self: RecordState.FAIL
    },
    doing: {
      self: RecordState.DOING
    }
  },
  [RecordLinkTypes.APPROVE]: {
    success: {
      next: {
        [RecordLinkTypes.RESULT]: RecordState.DEFAULT
      }
    },
    fail: {
      self: RecordState.FAIL
    },
    reject: {
      prev: {
        [RecordLinkTypes.PUBLISH]: RecordState.REJECT,
        [RecordLinkTypes.APPROVE]: RecordState.REJECT,
        [RecordLinkTypes.APPLY]: RecordState.REJECT
      }
    },
    doing: {
      self: RecordState.DOING
    }
  },
  [RecordLinkTypes.RESULT]: {
    success: {
      self: RecordState.SUCCESS
    },
    fail: {
      self: RecordState.FAIL
    },
    doing: {
      self: RecordState.DOING
    }
  },
  [RecordLinkTypes.APPLY]: {
    success: {
      next: {
        [RecordLinkTypes.APPROVE]: RecordState.DEFAULT
      }
    },
    fail: {
      self: RecordState.FAIL
    },
    doing: {
      self: RecordState.DOING
    }
  }
};

// 获取某个动作（path）下，下一个流程节点
export function getFlow({ type, nodeId }, workflow, path) {
  const linkIndex = workflow.findIndex(item => item.nodeId === nodeId);
  const curLink = workflow[linkIndex];
  const nextLink =
    linkIndex + 1 < workflow.length ? workflow[linkIndex + 1] : null;
  const preLink = workflow[linkIndex - 1];

  const obj = WorkflowMachine[type][path] || {};
  const key = Object.keys(obj)[0];
  if (key === "next") {
    if (nextLink) {
      return {
        nodeType: nextLink.type,
        nodeId: nextLink.nodeId,
        nodeStatus: obj[key][nextLink.type] || RecordState.DEFAULT,
        link: nextLink
      };
    }
    return {
      nodeType: curLink.type,
      nodeId: curLink.nodeId,
      nodeStatus: RecordState.SUCCESS,
      link: curLink
    };
  }
  if (key === "self") {
    return {
      nodeType: curLink.type,
      nodeId: curLink.nodeId,
      nodeStatus: obj[key] || RecordState.DEFAULT,
      link: curLink
    };
  }
  if (key === "prev") {
    return {
      nodeType: preLink.type,
      nodeId: preLink.nodeId,
      nodeStatus: obj[key][preLink.type] || RecordState.DEFAULT,
      link: preLink
    };
  }
  return [];
}

// 获取所有动作下的节点
export function getAllFlows(curLinK, workflow): any {
  return {
    [StatePath.DOING]: getFlow(curLinK, workflow, StatePath.DOING),
    [StatePath.SUCCESS]: getFlow(curLinK, workflow, StatePath.SUCCESS),
    [StatePath.FAIL]: getFlow(curLinK, workflow, StatePath.FAIL),
    [StatePath.REJECT]: getFlow(curLinK, workflow, StatePath.REJECT)
  };
}

// 流程节点: 初始化应用时设置
// TODO: 应该只需要存id
export const initWorkflow = [
  {
    nodeId: WorkflowNodeId.NEW,
    type: RecordLinkTypes.NEW,
    name: "新建发布单"
  },
  {
    nodeId: WorkflowNodeId.PUBLISH_DEV,
    type: RecordLinkTypes.PUBLISH,
    subType: "dev",
    name: "测试环境发布"
  },
  {
    nodeId: WorkflowNodeId.PUBLISH_ONLINE,
    type: RecordLinkTypes.PUBLISH,
    subType: "prod",
    name: "正式环境发布"
  }
];

// 初始状态
export const initState = {
  nodeType: RecordLinkTypes.NEW,
  nodeId: WorkflowNodeId.NEW,
  nodeStatus: RecordState.DEFAULT
};

export function getState(
  linkType: RecordLinkTypes,
  linkNodeId: number,
  linkStatus: RecordState
): string {
  return [linkType, linkNodeId, linkStatus].join("_");
}

// 获取某个流程节点的初始状态
export function getLinkDefaultState(link: any): StateInterface {
  const { nodeId, type: nodeType } = link;
  return {
    nodeId,
    nodeType,
    nodeStatus: RecordState.DEFAULT
  };
}

// 新的流程状态转化为老的status
export function mapStateToStatus(
  state: StateInterface,
  extra?: any
): DeployStatus {
  const { nodeType, nodeStatus } = state;
  const { subType } = extra || {};
  const mapOfStatus = {
    [RecordLinkTypes.NEW]: {
      [RecordState.DEFAULT]: DeployStatus.Default,
      [RecordState.DOING]: DeployStatus.Default,
      [RecordState.SUCCESS]: DeployStatus.CreateSuccess,
      [RecordState.FAIL]: DeployStatus.CreateSuccess
      // [RecordState.REJECT]: 0,
    },
    [RecordLinkTypes.PUBLISH]: {
      [RecordState.DEFAULT]: DeployStatus.PublishDevReady,
      [RecordState.DOING]: DeployStatus.PublishDevDoing,
      [RecordState.SUCCESS]: DeployStatus.PublishReady,
      [RecordState.FAIL]: DeployStatus.PublishDevFail,
      [RecordState.REJECT]: DeployStatus.PublishDevReady
    },
    [RecordLinkTypes.APPROVE]: {
      [RecordState.DEFAULT]: DeployStatus.PublishReady,
      [RecordState.DOING]: DeployStatus.PublishReady,
      [RecordState.SUCCESS]: DeployStatus.PublishReady,
      [RecordState.FAIL]: DeployStatus.PublishReady
      // [RecordState.REJECT]: 0,
    },
    [RecordLinkTypes.RESULT]: {
      [RecordState.DEFAULT]: DeployStatus.PublishDone,
      [RecordState.DOING]: DeployStatus.PublishDoing,
      [RecordState.SUCCESS]: DeployStatus.PublishDone,
      [RecordState.FAIL]: DeployStatus.PublishFail
      // [RecordState.REJECT]: 0,
    }
  };
  if (subType === "prod") {
    mapOfStatus[RecordLinkTypes.PUBLISH] = {
      [RecordState.DEFAULT]: DeployStatus.PublishReady,
      [RecordState.DOING]: DeployStatus.PublishDoing,
      [RecordState.SUCCESS]: DeployStatus.PublishDone,
      [RecordState.FAIL]: DeployStatus.PublishFail,
      [RecordState.REJECT]: DeployStatus.PublishReady
    };
  }
  return mapOfStatus[nodeType] && mapOfStatus[nodeType][nodeStatus];
}

// 老的status转化为新的状态
export function mapStatusToState(status: DeployStatus): any {
  // 迁移老状态用 后期可以删除
  const mapOfState = {
    [DeployStatus.Default]: {
      nodeId: WorkflowNodeId.NEW,
      nodeType: RecordLinkTypes.NEW,
      nodeStatus: RecordState.DEFAULT
    },
    [DeployStatus.CreateSuccess]: {
      nodeId: WorkflowNodeId.PUBLISH_DEV,
      nodeType: RecordLinkTypes.PUBLISH,
      nodeStatus: RecordState.SUCCESS
    },
    [DeployStatus.CreateFail]: {
      nodeId: WorkflowNodeId.NEW,
      nodeType: RecordLinkTypes.NEW,
      nodeStatus: RecordState.FAIL
    },
    [DeployStatus.PackageReady]: {
      nodeId: WorkflowNodeId.NEW,
      nodeType: RecordLinkTypes.NEW,
      nodeStatus: RecordState.DOING
    },
    [DeployStatus.PackageDoing]: {
      nodeId: WorkflowNodeId.NEW,
      nodeType: RecordLinkTypes.NEW,
      nodeStatus: RecordState.DOING
    },
    [DeployStatus.PackageFail]: {
      nodeId: WorkflowNodeId.NEW,
      nodeType: RecordLinkTypes.NEW,
      nodeStatus: RecordState.FAIL
    },
    [DeployStatus.PublishDevReady]: {
      nodeId: WorkflowNodeId.PUBLISH_DEV,
      nodeType: RecordLinkTypes.PUBLISH,
      nodeStatus: RecordState.DEFAULT
    },
    [DeployStatus.PublishDevDoing]: {
      nodeId: WorkflowNodeId.PUBLISH_DEV,
      nodeType: RecordLinkTypes.PUBLISH,
      nodeStatus: RecordState.DOING
    },
    [DeployStatus.PublishDevFail]: {
      nodeId: WorkflowNodeId.PUBLISH_DEV,
      nodeType: RecordLinkTypes.NEW,
      nodeStatus: RecordState.FAIL
    },
    [DeployStatus.PublishReady]: {
      nodeId: WorkflowNodeId.PUBLISH_ONLINE,
      nodeType: RecordLinkTypes.PUBLISH,
      nodeStatus: RecordState.DEFAULT
    },
    [DeployStatus.PublishDoing]: {
      nodeId: WorkflowNodeId.RESULT,
      nodeType: RecordLinkTypes.RESULT,
      nodeStatus: RecordState.DOING
    },
    [DeployStatus.PublishFail]: {
      nodeId: WorkflowNodeId.RESULT,
      nodeType: RecordLinkTypes.RESULT,
      nodeStatus: RecordState.FAIL
    },
    [DeployStatus.PublishDone]: {
      nodeId: WorkflowNodeId.RESULT,
      nodeType: RecordLinkTypes.RESULT,
      nodeStatus: RecordState.SUCCESS
    }
  };
  return mapOfState[status];
}

// 兼容一期历史记录
export function getNodeInfoByAction(
  action: WorkflowActionEnum
): WorkflowNodeId {
  const mapOfAction = {
    [WorkflowActionEnum.CREATE]: WorkflowNodeId.NEW,
    [WorkflowActionEnum.MODIFY]: WorkflowNodeId.PUBLISH_DEV,
    [WorkflowActionEnum.PUBLISH_DEV]: WorkflowNodeId.PUBLISH_DEV,
    [WorkflowActionEnum.PUBLISH_ONLINE]: WorkflowNodeId.PUBLISH_ONLINE,
    [WorkflowActionEnum.APPROVE]: WorkflowNodeId.APPROVE_QA,
    [WorkflowActionEnum.DONE]: WorkflowNodeId.RESULT
  };
  return mapOfAction[action];
}
