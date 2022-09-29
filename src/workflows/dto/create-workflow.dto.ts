import { EntityManager } from "typeorm";

export class CreateWorkflowDto {
  appId: number
  workflow?: any
  auditors?: any
  manager?: EntityManager
}
