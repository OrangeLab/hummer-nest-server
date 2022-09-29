import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class RecordModuleVersion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false })
  recordId: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false})
  moduleId: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: 'module versions的id' })
  versionId: number;

  @Column()
  version: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}


