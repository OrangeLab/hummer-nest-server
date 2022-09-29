import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Module {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: '应用ID' })
  appId: number;

  @Column({type: 'int', nullable: true})
  lastestVersionId: number;

  @Column({default: ''})
  name: string;

  @Column({default: ''})
  flag: string;

  @Column({default: ''})
  repo: string;

  @Column({default: ''})
  description: string;

  // 构建包路径 预留字段
  @Column({default: ''})
  distPath: string;

  @Column({default: ''})
  config: string;

  @Column({nullable: false, default: ''})
  operator: string;

  @Column({default: null})
  operatorId: number;

  @Column({nullable: false, default: ''})
  creator: string;

  @Column({default: null})
  creatorId: number;

  @Column({ name: 'is_deleted', type: 'tinyint', unsigned: true, nullable: false, default: 0, comment: '是否删除' })
  isDeleted: number;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: false, width: 6, default: '1970-01-01 00:00:00', comment: '删除时间',})
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;


  // TODO: oneToMany ModuleVersions
}


