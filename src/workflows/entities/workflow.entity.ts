import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Workflow {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ name: 'app_id', type: 'int', unsigned: true, default: 0, nullable: false, comment: '应用ID' })
  appId: number;

  @Column({nullable: true})
  linkJson: string;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}


