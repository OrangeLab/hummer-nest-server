import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class LimitRecordVersionLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: 'recordVersion id' })
  recordVersionId: number;

  @Column({type: 'tinyint', nullable: true})
  platform: number;

  @Column({type: 'tinyint', nullable: true})
  status: number;

  @Column({nullable: true})
  version: string;

  @Column({nullable: true})
  action: string;

  @Column({type: 'json', nullable: true})
  limitLog: string | any[]


  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}