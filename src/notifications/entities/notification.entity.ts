import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, OneToOne } from 'typeorm';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'bigint', unsigned: true, comment: '应用ID' })
  appId: number;

  @Column({type: 'json', nullable: true})
  emails: string
}


