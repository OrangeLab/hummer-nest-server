import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UserFavoriteApplication {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({type: 'bigint', unsigned: true, nullable: false, comment: '用户ID' })
  userId: number;


  @Column({type: 'bigint', unsigned: true, nullable: false, comment: '收藏的appId' })
  collectId: number;

  @Column()
  collectType: string;
}


