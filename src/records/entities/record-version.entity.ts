import { LimitRecordVersionLog } from 'src/limits/entities/limit-record-version-log.entity';
import { LimitRecordVersion } from 'src/limits/entities/limit-record-version.entity';
import { Limit } from 'src/limits/entities/limit.entity';
import { NativeVersion } from 'src/native-versions/entities/native-version.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Record } from './record.entity';

@Entity()
export class RecordVersion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false })
  recordId: number;

  @Column({ type: 'bigint', unsigned: true, default: 0, nullable: false, comment: 'native_versioins的id' })
  versionId: number;

  @Column({nullable: true})
  configPath: string;

  @Column({nullable: true, length: 2048})
  config: string;

  @Column({nullable: true})
  packageKey: string;

  @Column({type: 'tinyint', nullable: true})
  platform: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  LimitRecordVersion: LimitRecordVersion;

  NativeVersion: NativeVersion;

  NativeVersionLimit: Limit;

  Record: Record;

  RecordVersionLimitsLog: LimitRecordVersionLog;
}


