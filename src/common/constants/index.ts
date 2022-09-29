/* eslint-disable import/prefer-default-export */

// owner
// collaborator 可操作应用集合、应用、发布, 无法编辑应用集合和应用信息
// guest 可浏览应用列表
export enum RolesCodeEnum {
  Admin = "Admin",
  Owner = "Owner",
  Collaborator = "Collaborator",
  QA = "QA",
  Guest = "Guest"
}

export enum RolesIdEnum {
  Admin = 1,
  Owner = 2,
  Collaborator = 3,
  QA = 4,
  Guest = 5
}

// 灰度状态
export const LimitConfig = {
  doing: 4, // 灰度中
  done: 2, // 全量
  stop: 1, // 停止灰度
  init: 0, // 默认 || 灰度中
  terminated: 3 // 提前结束 (未开始灰度就结束)
};


// 装饰器id类型
export enum VerifyIdType {
  APP = "app",
  RECORD = "record"
}

// 发布单类型
export const BusinessTypes = {
  Feature: 0, // 0 需求
  0: "需求",
  BugFix: 1, // 1 bugfix
  1: "缺陷修复",
  Test: 2, // 2 测试
  2: "测试"
};
