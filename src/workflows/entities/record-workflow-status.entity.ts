import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class RecordWorkflowStatus {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: '发布单ID' })
  recordId: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: '审批流ID' })
  workflowId: number;

  @Column({nullable: true})
  nodeType: string;

  @Column({type: 'int', nullable: true})
  nodeStatus: number;

  @Column({type: 'int', nullable: true})
  nodeId: number;
}


