import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Auditor {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ name: 'app_id', type: 'bigint', unsigned: true, default: 0, nullable: false, comment: '应用ID' })
  appId: number;

  @Column({type: 'bigint', unsigned: true, default: 0, nullable: false, comment: '发布流ID' })
  workflowId: number;

  @Column({type: 'int', unsigned: true, default: 0, nullable: false, comment: '应用ID' })
  nodeId: number;

  @Column({type: 'int', unsigned: true, default: 0, nullable: false, comment: '用户ID' })
  userId: number;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}


