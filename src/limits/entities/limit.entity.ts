import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Limit {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: '开关id' })
  toggleId: number;

  @Column()
  toggleName: string;

  @Column()
  operator: string;

  @Column()
  operatorId: number;

  @Column({ name: 'is_deleted', type: 'tinyint', unsigned: true, nullable: false, default: 0, comment: '是否删除' })
  isDeleted: number;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: false, width: 6, default: '1970-01-01 00:00:00', comment: '删除时间',})
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}