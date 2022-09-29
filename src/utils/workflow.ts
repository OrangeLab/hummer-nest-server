import { WorkflowNodeLink, WorkflowNodeSpecificComment } from "src/common/constants/types";
import { isEmpty } from "lodash"

interface Link {
  nodeId: number;
  type: string;
  subType?: string;
  name: string;
  extra?: object;
}

interface UserInfo {
  userId: number;
  email: string;
  username_zh: string;
}

export const getLinks = (links: undefined | Link[]): string => {
  if (!links) return "";
  const nodes = links.map(item => item.nodeId);
  return JSON.stringify(nodes);
}

export const getLinkNodes =(links: undefined | any[]): Link[] => {
  if (!links || isEmpty(links)) return [];
  const nodes = links.map(key => WorkflowNodeLink[key]);
  return nodes;
}

export const formatRecordRow = (records: any[], userId: number) => {
  return records.map(record => {
    const {
      id,
      appId,
      name,
      description,
      type,
      icon,
      status,
      version,
      platform,
      createdAt,
      creator,
      creatorId,
      operator,
      updatedAt,
      recordWorkflowStatus: recordWorkflow
    } = record;
  
    const { nodeId, nodeType, nodeStatus } = recordWorkflow || {};
    // 发布单的发布状态
    const nodeComment =
      nodeId && WorkflowNodeSpecificComment[nodeId]?.[nodeStatus];
  
    return {
      id,
      appId,
      name,
      type,
      description,
      icon,
      status,
      version,
      platform,
      createdAt,
      creator,
      operator,
      updatedAt,
      isCurrent: creatorId === userId,
      nodeId,
      nodeType,
      nodeStatus,
      nodeComment
    };
  })
}