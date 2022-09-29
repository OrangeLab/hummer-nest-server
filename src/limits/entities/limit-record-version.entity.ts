import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
@Entity()
export class LimitRecordVersion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: 'limit id' })
  limitId: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: 'recordVersion id' })
  recordVersionId: number;

  @Column({nullable: true})
  name: string;

  @Column({type: 'tinyint', nullable: true})
  percent: number;

  @Column({type: 'tinyint', nullable: true})
  status: number;

  @Column({nullable: true})
  device: string;

  @Column({nullable: true})
  city: string;

  @Column({nullable: true})
  extra: string;

  @Column({nullable: true})
  description: string;

  @Column()
  operator: string;

  @Column()
  operatorId: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}